import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import express, { type Request, type Response } from "express";
import { logger } from "./helpers/logger.ts";
import { server } from "./helpers/server.ts";
import { registerRunBrowserTaskTool } from "./tools/registerRunBrowserTaskTool.ts";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { parseArgs } from "util";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { randomUUID } from "crypto";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import cors from "cors";


const transports = {
  streamable: {} as Record<string, StreamableHTTPServerTransport | undefined>,
  sse: {} as Record<string, SSEServerTransport | undefined>
};


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

    app.use(
      cors({
        origin: "*", // Configure appropriately for production, for example:
        // origin: ['https://your-remote-domain.com', 'https://your-other-remote-domain.com'],
        exposedHeaders: ["Mcp-Session-Id"],
        allowedHeaders: ["Content-Type", "mcp-session-id"],
      })
    );

    app.post("/mcp", async (request, response) => {

      const sessionID = request.headers["mcp-session-id"] as string | undefined;
      
      let transport: StreamableHTTPServerTransport;

      if (sessionID && transports.streamable[sessionID]) {

        transport = transports.streamable[sessionID];

      } else if (!sessionID && isInitializeRequest(request.body)) {

        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (newSessionID) => {
            transports.streamable[newSessionID] = transport;
          },
        });

        transport.onclose = () => {
          if (transport.sessionId) {
            delete transports.streamable[transport.sessionId];
          }
        };

        await server.connect(transport);

      } else {

        response.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Bad Request: No valid session ID provided"
          },
          id: null
        });

        return;
      }

      await transport.handleRequest(request, response, request.body);
    });

    async function handleSessionRequest(request: Request, response: Response) {

      const sessionID = request.headers["mcp-session-id"] as string | undefined;
      if (!sessionID) {
        response.status(400).send("Invalid or missing session ID");
        return;
      }

      const transport = transports.streamable[sessionID];
      if (!transport) {
        response.status(400).send("No transport found for sessionID");
        return;
      }

      await transport.handleRequest(request, response);
    }

    app.get("/mcp", handleSessionRequest);
    app.delete("/mcp", handleSessionRequest);

    app.get("/sse", async (request, response) => {

      const transport = new SSEServerTransport("/messages", response);
      transports.sse[transport.sessionId] = transport;

      response.on("close", () => {
        delete transports.sse[transport.sessionId];
      });

      await server.connect(transport);
    });

    app.post("/messages", async (request, response) => {

      const sessionID = request.query.sessionId as string;
      if (!sessionID) {
        response.status(400).send("Invalid or missing session ID");
        return;
      }

      const transport = transports.sse[sessionID];
      if (!transport) {
        response.status(400).send("No transport found for sessionID");
        return;
      }

      await transport.handlePostMessage(request, response, request.body);
    });
  
    const port = parseInt(process.env.PORT || "8888");
    app.listen(port, () => {
      console.log(`Gemini Computer Use MCP Server running on http://localhost:${port}/mcp and http://localhost:${port}/sse`);
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
