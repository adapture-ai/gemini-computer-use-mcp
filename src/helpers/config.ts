import { resolve } from "path";


export const PROJECT_PATH = process.env.PROJECT_PATH ? resolve(process.cwd(), process.env.PROJECT_PATH) : process.cwd();


export const GEMINI_API_KEY = (
  process.env.GEMINI_API_KEY ||
  ""
);


export const VERTEX_PROJECT_KEY = (
  process.env.VERTEX_PROJECT_KEY ||
  ""
);


if (!VERTEX_PROJECT_KEY && !GEMINI_API_KEY) {
  throw "VERTEX_PROJECT_KEY or GEMINI_API_KEY is required in env";
}


export const MODEL = process.env.MODEL || "gemini-2.5-computer-use-preview-10-2025";
