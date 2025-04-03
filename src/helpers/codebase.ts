import { type CachedContent, createPartFromUri, createUserContent } from "@google/genai";
import { existsSync } from "fs";
import { readdir, readFile, readlink, stat } from "fs/promises";
import { basename, dirname, resolve } from "path";

import { ai } from "./ai";
import { CODEBASE_PATH, MODEL } from "./config";
import { logger } from "./logger";


const TTL = 15 * 60; // 15 minutes


class Codebase {


  private cache: CachedContent | undefined;

  private cacheSystemInstructions: string | undefined;

  private cacheContent: string | undefined;

  getCache({
    path,
    model,
    systemInstructions,
    signal,
  }: {
    path: string;
    model: string;
    systemInstructions: string;
    signal?: AbortSignal;
  }) {

    return (async () => {

      signal?.throwIfAborted();

      const absolutePath = resolve(CODEBASE_PATH, path);

      const content = await getContent(absolutePath);

      if (
        this.cache?.name &&
        (!this.cache.expireTime || Date.now() < new Date(this.cache.expireTime).getTime()) &&
        this.cache.model?.replace(/^models\//, "") === model &&
        this.cacheSystemInstructions === systemInstructions &&
        this.cacheContent === content
      ) {
        const updatedCache = await ai.caches.update({
          name: this.cache.name,
          config: {
            ttl: `${TTL}s`,
          },
        });
        await logger.info("Extend cache expire time to:", updatedCache.expireTime);
        this.cache = updatedCache;
        return {
          cache: updatedCache,
        };
      }

      await logger.info("Cache expired or not matching.", {
        expireTime: this.cache?.expireTime ? new Date(this.cache.expireTime).getTime() : null,
        now: Date.now(),
        model: this.cache?.model?.replace(/^models\//, "") || null,
        newModel: model,
        systemInstructions: this.cacheSystemInstructions || null,
        newSystemInstructions: systemInstructions,
        content: this.cacheContent?.length || null,
        newContent: content.length || null,
      });

      if (!MODEL.startsWith("gemini-1.5-")) {
        await logger.warn("Cache is not supported for this model");
        return {
          content: content,
        };
      }

      signal?.throwIfAborted();

      await logger.info("Uploading file for cache...");

      const encoder = new TextEncoder();
      const encodedContent = encoder.encode(content);
      const blob = new Blob([encodedContent], { type: "text/plain" });

      const uploadedFile = await ai.files.upload({
        file: blob,
        config: { mimeType: "text/plain" },
      });

      if (!uploadedFile || !uploadedFile.uri) {
        throw new Error("Failed to upload file");
      }

      await logger.info("File uploaded:", uploadedFile.uri);

      signal?.throwIfAborted();

      if (this.cache?.name) {
        await logger.info("Deleting old cache...");
        await ai.caches.delete({ name: this.cache.name });
        this.cache = undefined;
      }

      signal?.throwIfAborted();

      await logger.info("Creating cache...");

      let cache;
      try {
        cache = await ai.caches.create({
          model: model,
          config: {
            contents: createUserContent(createPartFromUri(uploadedFile.uri, "text/plain")),
            systemInstruction: "You are an expert analyzing transcripts.",
            ttl: `${TTL}s`,
          },
        });
      } catch (error) {
        await logger.error("Failed to create cache:", error);
        return {
          content: content,
        };
      }

      await logger.info("Cache expire time:", cache.expireTime);

      signal?.throwIfAborted();

      this.cache = cache;
      this.cacheSystemInstructions = systemInstructions;
      this.cacheContent = content;

      return {
        cache: cache,
      };

    })();

  }


}

export const codebase = new Codebase();


interface FileSystemItem {
  fileName: string;
  folderPath: string;
  updatedAt: string;
}


interface FileItem extends FileSystemItem {
  content: {
    type: "link";
    target: string;
  } | {
    type: "binary";
    size: number;
  } | {
    type: "text";
    text: string;
  };
}


async function getContent(absolutePath: string) {

  // await logger.info("Indexing codebase...");

  const files = await indexPath(absolutePath);

  files.sort((a, b) => {
    if (a.folderPath !== b.folderPath) {
      return a.folderPath.localeCompare(b.folderPath);
    }
    return a.fileName.localeCompare(b.fileName);
  });

  const content = files.map((file) => {

    let text = "";
    text += "/**\n";
    text += ` * File: ${file.fileName}\n`;
    text += ` * Folder: ${file.folderPath}\n`;
    text += ` * Updated: ${file.updatedAt}\n`;

    if (file.content.type === "link") {
      text += " * Type: Link\n";
      text += ` * Target: ${file.content.target}\n`;
    }

    if (file.content.type === "binary") {
      text += " * Type: Binary\n";
      text += ` * Size: ${file.content.size} bytes\n`;
    }

    if (file.content.type === "text") {
      text += " * Type: Text\n";
    }

    text += "*/\n";

    if (file.content.type === "text") {
      text += "\n";
      text += file.content.text;
    }

    return text;

  }).join("\n\n");

  // await logger.info("Indexing completed.");

  return content;
}


async function indexPath(absolutePath: string): Promise<FileItem[]> {

  if (!existsSync(absolutePath)) {
    await logger.warn("Path does not exist:", absolutePath);
    return [];
  }

  // await logger.info("Indexing path:", absolutePath);

  const absoluteParentPath = dirname(absolutePath);
  const name = basename(absolutePath);

  const stats = await stat(absolutePath);

  const updatedAt = stats.mtime.toISOString();

  if (stats.isDirectory()) {

    if (
      name === ".browser-use" ||
      name === ".browsers" ||
      name === ".git" ||
      name === ".next" ||
      name === ".types" ||
      name === ".venv" ||
      name === "build" ||
      name === "node_modules" ||
      name === ".githooks" ||
      name.includes("-mcp")
    ) {
      return [];
    }

    const childrenPaths = await readdir(absolutePath);

    const files = (await Promise.all(childrenPaths.map(async (childPath) => {
      const absoluteChildPath = `${absolutePath}/${childPath}`;
      const children = await indexPath(absoluteChildPath);
      return children;
    }))).flat();

    return files;
  }

  if (
    name === ".DS_Store" ||
    name === "package-lock.json" ||
    name === "pnpm-lock.yaml" ||
    name === "yarn.lock" ||
    name === "yarn-error.log" ||
    name === "yarn-debug.log" ||
    name === "bun.lock" ||
    name === "uv.lock" ||
    name === "LICENSE.txt" ||
    name.endsWith(".pyc") ||
    name.endsWith(".roomodes") ||
    name.endsWith(".sum") || // like .lock but for golang
    name.endsWith(".log")
  ) {
    return [];
  }

  if (stats.isSymbolicLink()) {
    const targetPath = await readlink(absolutePath);
    const file: FileItem = {
      fileName: name,
      folderPath: absoluteParentPath,
      updatedAt: updatedAt,
      content: {
        type: "link",
        target: targetPath,
      },
    };
    return [file];
  }

  if (stats.isFile()) {

    if (stats.size > 5 * 1024 * 1024) {
      await logger.warn(absolutePath, "Large file -> binary");
      const file: FileItem = {
        fileName: name,
        folderPath: absoluteParentPath,
        updatedAt: updatedAt,
        content: {
          type: "binary",
          size: stats.size,
        },
      };
      return [file];
    }

    // await logger.info(absolutePath);
    const file: FileItem = {
      fileName: name,
      folderPath: absoluteParentPath,
      updatedAt: updatedAt,
      content: {
        type: "text",
        text: await readFile(absolutePath, "utf-8"),
      },
    };
    return [file];
  }

  await logger.warn(absolutePath, "Unknown type");
  return [];
}
