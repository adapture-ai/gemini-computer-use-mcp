/* eslint-disable import/extensions */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { codebase } from "./helpers/codebase";
import { logger } from "./helpers/logger";
import { addServerEventListener, server } from "./helpers/server";
import { addAskCodebaseTool } from "./tools/askCodebaseTool";


try {


  addAskCodebaseTool(server);


  codebase.startIndexing();

  addServerEventListener("close", () => {
    codebase.stopIndexing();
  });


  const transport = new StdioServerTransport();
  await server.connect(transport);


} catch (error) {

  await logger.error("Error in main:", error);

  throw error;
}
