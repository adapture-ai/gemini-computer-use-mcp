import { resolve } from "path";


export const CODEBASE_PATH = process.env.CODEBASE_PATH ? resolve(process.cwd(), process.env.CODEBASE_PATH) : process.cwd();


export const GEMINI_API_KEY = (
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  ""
);

if (!GEMINI_API_KEY) {
  throw "Missing GEMINI_API_KEY in env";
}


export const MODEL = process.env.MODEL || "gemini-2.0-flash";
