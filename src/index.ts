import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import express from "express";
import { logger } from "./helpers/logger.ts";
import { server } from "./helpers/server.ts";
import { registerRunBrowserTaskTool } from "./tools/registerRunBrowserTaskTool.ts";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { parseArgs } from "util";


try {

  let args = process.argv.slice(2);
  while (args[0] === "--") {
    args = args.slice(1);
  }

  const {
    values: {
      stream,
    },
  } = parseArgs({
    args: args,
    options: {
      stream: {
        type: "boolean",
        short: "s",
        default: false,
      },
    },
    strict: false,
    allowNegative: true,
  });

  registerRunBrowserTaskTool(server);

  if (stream) {

    const app = express();
    app.use(express.json());

    app.post("/mcp", async (request, response) => {

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true
      });
  
      response.on("close", () => {
        transport.close();
      });
  
      await server.connect(transport);

      await transport.handleRequest(request, response, request.body);
    });
  
    const port = parseInt(process.env.PORT || "8888");
    app.listen(port, () => {
      console.log(`Gemini Computer Use MCP Server running on http://localhost:${port}/mcp`);
    }).on("error", (error) => {
      console.error("Server error:", error);
      process.exit(1);
    });

  } else {

    const transport = new StdioServerTransport();
    await server.connect(transport);
  }

} catch (error) {

  await logger.error("[main]", error);

  throw error;
}
