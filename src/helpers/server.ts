import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "./logger.ts";


export const server = new McpServer({
  name: "Gemini Computer Use",
  version: "0.0.1",
});


server.server.oninitialized = () => {

  if (server.server.getClientCapabilities()?.logging) {
    logger.setServer(server);
  }

  logger.info("Server initialized");
};


server.server.onerror = (error) => {
  logger.error("[server]", error);
};


const closeListeners: (() => void)[] = [];

server.server.onclose = () => {

  logger.info("Server closed");

  closeListeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      logger.error("[server][close]", error);
    }
  });

};


// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function addServerEventListener(_name: "close", listener: () => void) {
  closeListeners.push(listener);
}
