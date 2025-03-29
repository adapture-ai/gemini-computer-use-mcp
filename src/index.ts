import { FastMCP } from "fastmcp";
import { addAskTool } from "./tools/addAskTool";


const server = new FastMCP({
  name: "Codebase",
  version: "0.0.1",
});


addAskTool(server);


server.start({
  transportType: "stdio",
});
