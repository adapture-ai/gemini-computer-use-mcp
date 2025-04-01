import { FastMCP } from "fastmcp";

import { indexCodebase } from "./helpers/indexCodebase";
import { addCodebaseResource } from "./resources/getCodebaseResource";
import { addAskCodebaseTool } from "./tools/askCodebaseTool";


const server = new FastMCP({
  name: "Codebase",
  version: "0.0.1",
});


addCodebaseResource(server);
addAskCodebaseTool(server);


await Promise.all([

  (async () => {
    // console.log("Starting Codebase MCP server...");
    await server.start({
      transportType: "stdio",
    });
  })(),

  (async () => {
    // console.log("Indexing codebase...");
    await indexCodebase();
  })(),

]);
