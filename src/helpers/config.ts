import { resolve } from "path";


export const CODEBASE_PATH = process.env.CODEBASE_PATH ? resolve(process.cwd(), process.env.CODEBASE_PATH) : "";
if (!CODEBASE_PATH) {
  throw new Error("CODEBASE_PATH environment variable is not set.");
}


export const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
if (!GOOGLE_API_KEY) {
  throw new Error("GOOGLE_API_KEY environment variable is not set.");
}


export const MODEL = process.env.MODEL || "gemini-1.5-pro-002";
