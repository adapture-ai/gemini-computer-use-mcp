import { existsSync } from "fs";
import { readdir, readFile, readlink, stat } from "fs/promises";
import { basename, dirname, resolve } from "path";

import { CODEBASE, type FileItem } from "./codebase";


const LOG_ENABLED = false;


export async function indexCodebase() {

  const codebasePath = Bun.env.CODEBASE_PATH;
  if (!codebasePath) {
    throw new Error("CODEBASE_PATH environment variable is not set.");
  }

  const absoluteCodebasePath = resolve(process.cwd(), codebasePath);
  const files = await loadPath(absoluteCodebasePath);
  files.sort((a, b) => {
    if (a.folderPath !== b.folderPath) {
      return a.folderPath.localeCompare(b.folderPath);
    }
    return a.fileName.localeCompare(b.fileName);
  });
  CODEBASE.files = files;
}


async function loadPath(absolutePath: string): Promise<FileItem[]> {

  if (!existsSync(absolutePath)) {
    if (LOG_ENABLED) console.warn(absolutePath, "Not exists");
    return [];
  }

  // if (LOG_ENABLED) console.log(absolutePath, "Loading...");

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
      name === "node_modules"
    ) {
      return [];
    }

    const childrenPaths = await readdir(absolutePath);

    const files = (await Promise.all(childrenPaths.map(async (childPath) => {
      const absoluteChildPath = `${absolutePath}/${childPath}`;
      const children = await loadPath(absoluteChildPath);
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
      if (LOG_ENABLED) console.warn(absolutePath, "Large file -> binary");
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

    if (LOG_ENABLED) console.log(absolutePath);
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

  if (LOG_ENABLED) console.warn(absolutePath, "Unknown type");
  return [];
}
