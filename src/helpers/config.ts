import { resolve } from "path";


export const PROJECT_PATH = process.env.PROJECT_PATH ? resolve(process.cwd(), process.env.PROJECT_PATH) : process.cwd();


export const GEMINI_API_KEY = (
  process.env.GEMINI_API_KEY ||
  ""
);


export const MODEL = process.env.MODEL || "gemini-2.5-computer-use-preview-10-2025";
