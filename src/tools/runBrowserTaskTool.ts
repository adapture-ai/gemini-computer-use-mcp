/* eslint-disable import/extensions */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { ai } from "../helpers/ai";
import { MODEL } from "../helpers/config";
import { logger } from "../helpers/logger";


export function addRunBrowserTaskTool(server: McpServer) {

  server.tool(

    // Name
    "run_browser_task",

    // Description
    "Control browser to perform a task",

    // Params Schema
    {
      task: z.string().describe("The task to perform"),
    },

    // Callback
    async (args, extra) => {

      try {

        const {
          task,
        } = args;

        const {
          signal,
        } = extra;

        signal.throwIfAborted();

        await logger.info(`Performing task: ${task}...`);
        const tb0 = Date.now();
        const response = await ai.models.generateContent({
          model: MODEL,
          config: {
            systemInstruction: "",
          },
          contents: [],
        });
        const tb2 = Date.now();
        await logger.info("Task performed in", ((tb2 - tb0) / 1000.0).toFixed(1), "seconds.");

        signal.throwIfAborted();

        return {
          content: [{
            type: "text",
            text: "",
          }],
        };
        
      } catch (error) {

        await logger.error("[run_browser_task]", error);

        throw error;
      }

    },

  );

}
