/* eslint-disable import/extensions */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { logger } from "./helpers/logger";
import { server } from "./helpers/server";
import { addRunBrowserTaskTool } from "./tools/runBrowserTaskTool";


try {

  addRunBrowserTaskTool(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

} catch (error) {

  await logger.error("[main]", error);

  throw error;
}
