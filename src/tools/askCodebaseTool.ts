/* eslint-disable import/extensions */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { ai } from "../helpers/ai";
import { codebase } from "../helpers/codebase";
import { MODEL } from "../helpers/config";
import { logger } from "../helpers/logger";


const SYSTEM_INSTRUCTION = "You are a helpful assistant that answers questions about the codebase.";


export function addAskCodebaseTool(server: McpServer) {

  server.tool(

    // Name
    "ask_codebase",

    // Description
    "Ask a question about the codebase under the given path.",

    // Params Schema
    {
      question: z.string().describe("The question to ask the codebase"),
      path: z.string().describe("The path to the codebase, can be a file or a directory"),
    },

    // Callback
    async (args, extra) => {

      const {
        question,
        path,
      } = args;

      const {
        signal,
      } = extra;

      signal.throwIfAborted();

      await logger.info("Getting context cache...", MODEL);
      const ta0 = Date.now();
      const {
        cache,
        content,
      } = await codebase.getCache({
        path: path,
        model: MODEL,
        systemInstructions: SYSTEM_INSTRUCTION,
        signal: signal,
      });
      const ta1 = Date.now();
      await logger.info("Context cache retrieved in", ((ta1 - ta0) / 1000.0).toFixed(1), "seconds.");

      signal.throwIfAborted();

      const response = await (async () => {

        if (!cache) {

          await logger.warn("No cache supported. Sending codebase content without cache.");

          await logger.info(`Asking question: ${question}...`);
          const tb0 = Date.now();
          const newResponse = await ai.models.generateContent({
            model: MODEL,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
            },
            contents: [
              "Answer the question about the codebase.",
              "# QUESTION:",
              `${question}`,
              "# CODEBASE CONTENT:",
              `${content}`,
            ].join("\n\n"),
          });
          const tb2 = Date.now();
          await logger.info("Question answered in", ((tb2 - tb0) / 1000.0).toFixed(1), "seconds.");

          signal.throwIfAborted();

          return newResponse;
        }

        signal.throwIfAborted();

        await logger.info(`Asking question: ${question}...`);
        const tb0 = Date.now();
        const newResponse = await ai.models.generateContent({
          model: MODEL,
          contents: question,
          config: {
            ...(cache ? { cachedContent: cache.name } : {}),
          },
        });
        const tb2 = Date.now();
        await logger.info("Question answered in", ((tb2 - tb0) / 1000.0).toFixed(1), "seconds.");

        signal.throwIfAborted();

        return newResponse;

      })();

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
