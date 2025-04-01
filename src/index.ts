import { FastMCP } from "fastmcp";

import { indexCodebase } from "./helpers/indexCodebase";
import { addAskCodebaseTool } from "./tools/addAskCodebaseTool";


const server = new FastMCP({
  name: "Codebase",
  version: "0.0.1",
});


addAskCodebaseTool(server);


await Promise.all([

  (async () => {
    console.log("Starting Codebase MCP server...");
    await server.start({
      transportType: "sse",
      sse: {
        endpoint: "/sse",
        port: 3001,
      },
    });
  })(),

  (async () => {
    console.log("Indexing codebase...");
    await indexCodebase();
  })(),

]);
