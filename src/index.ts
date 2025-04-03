/* eslint-disable import/extensions */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { logger } from "./helpers/logger";
import { server } from "./helpers/server";
import { addAskCodebaseTool } from "./tools/askCodebaseTool";


try {


  addAskCodebaseTool(server);


  const transport = new StdioServerTransport();
  await server.connect(transport);


} catch (error) {

  await logger.error("Error in main:", error);

  throw error;
}
