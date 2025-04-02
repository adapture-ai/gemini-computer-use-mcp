/* eslint-disable import/extensions */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { ai } from "../helpers/ai";
import { codebase } from "../helpers/codebase";
import { MODEL } from "../helpers/config";
import { logger } from "../helpers/logger";


export function addAskCodebaseTool(server: McpServer) {

  server.tool(

    // Name
    "Ask Codebase",

    // Description
    "Ask a question about the codebase",

    // Params Schema
    {
      question: z.string(),
    },

    // Callback
    async (args, extra) => {

      const {
        question,
      } = args;

      const {
        signal,
      } = extra;

      signal.throwIfAborted();

      await logger.info("Getting context cache...");
      const ta0 = Date.now();
      const cache = await codebase.getCache({
        model: MODEL,
        systemInstructions: "You are a helpful assistant that answers questions about the codebase.",
      });
      const ta1 = Date.now();
      await logger.info("Context cache retrieved in", ((ta1 - ta0) / 1000.0).toFixed(1), "seconds.");

      signal.throwIfAborted();

      await logger.info(`Asking question: ${question}...`);
      const t2 = Date.now();
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: question,
        config: {
          ...(cache ? { cachedContent: cache.name } : {}),
        },
      });
      const t3 = Date.now();
      await logger.info("Question answered in", ((t3 - t2) / 1000.0).toFixed(1), "seconds.");

      signal.throwIfAborted();

      return {
        content: [{
          type: "text",
          text: response.text || "",
        }],
      };

    },

  );

}
