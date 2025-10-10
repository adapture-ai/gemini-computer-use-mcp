import { GoogleGenAI } from "@google/genai";

import { GEMINI_API_KEY, VERTEX_PROJECT_KEY } from "./config";


export const ai = new GoogleGenAI({

  ...(GEMINI_API_KEY && { 
    apiKey: GEMINI_API_KEY,
  }),

  ...(VERTEX_PROJECT_KEY && { 
    vertexai: true,
    project: VERTEX_PROJECT_KEY,
    location: "global",
  }),

});
