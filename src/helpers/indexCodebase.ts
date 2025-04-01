import { existsSync } from "fs";
import { readdir, readFile, readlink, stat } from "fs/promises";
import { basename, dirname, resolve } from "path";

import { CODEBASE, type FileItem, type FolderItem } from "./codebase";


export async function indexCodebase() {

  const codebasePath = process.env.CODEBASE_PATH;
  if (!codebasePath) {
    throw new Error("CODEBASE_PATH environment variable is not set.");
  }

  const absoluteCodebasePath = resolve(process.cwd(), codebasePath);
  CODEBASE.content = await loadPath(absoluteCodebasePath);
}


async function loadPath(absolutePath: string): Promise<FolderItem | FileItem | null> {

  if (!existsSync(absolutePath)) {
    // console.warn(absolutePath, "Not exists");
    return null;
  }


  // console.log(absolutePath, "Loading...");

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
      name === ".venv" ||
      name === "build" ||
      name === "node_modules"
    ) {
      const folder: FolderItem = {
        name: name,
        absoluteParentPath: absoluteParentPath,
        updatedAt: updatedAt,
        folders: [],
        files: [],
      };
      return folder;
    }

    const childrenPaths = await readdir(absolutePath);

    const children = await Promise.all(childrenPaths.map(async (childPath) => {
      const absoluteChildPath = `${absolutePath}/${childPath}`;
      const child = await loadPath(absoluteChildPath);
      return child;
    }));

    const folder: FolderItem = {
      name: name,
      absoluteParentPath: absoluteParentPath,
      updatedAt: updatedAt,
      folders: children.filter((child): child is FolderItem => child !== null && !("content" in child)),
      files: children.filter((child): child is FileItem => child !== null && "content" in child),
    };

    return folder;
  }

  if (stats.isSymbolicLink()) {
    const targetPath = await readlink(absolutePath);
    const file: FileItem = {
      name: name,
      absoluteParentPath: absoluteParentPath,
      updatedAt: updatedAt,
      content: {
        type: "link",
        target: targetPath,
      },
    };
    return file;
  }

  if (stats.isFile()) {

    if (stats.size > 1024 * 1024) {
      // console.warn(absolutePath, "Large file, considered binary.");
      const file: FileItem = {
        name: name,
        absoluteParentPath: absoluteParentPath,
        updatedAt: updatedAt,
        content: {
          type: "binary",
          size: stats.size,
        },
      };
      return file;
    }

    // console.log(absolutePath, "Loading text content...");
    const file: FileItem = {
      name: name,
      absoluteParentPath: absoluteParentPath,
      updatedAt: updatedAt,
      content: {
        type: "text",
        text: await readFile(absolutePath, "utf-8"),
      },
    };
    return file;
  }

  // console.warn(absolutePath, "Ignored unknown file type");
  return null;
}
