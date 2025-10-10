/* eslint-disable import/extensions */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { logger } from "./helpers/logger.ts";
import { server } from "./helpers/server.ts";
import { addRunBrowserTaskTool } from "./tools/runBrowserTaskTool.ts";


try {

  addRunBrowserTaskTool(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

} catch (error) {

  await logger.error("[main]", error);

  throw error;
}
