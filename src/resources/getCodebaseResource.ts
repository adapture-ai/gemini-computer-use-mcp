import type { FastMCP } from "fastmcp";

import { CODEBASE } from "../helpers/codebase";


export function addCodebaseResource<T extends Record<string, unknown> | undefined>(server: FastMCP<T>) {

  server.addResource({

    name: "Application Logs",
    uri: "file:///codebase.txt",
    mimeType: "text/plain",

    load: async () => (
      getCodebaseTexts()
        .map((text) => ({
          text: text,
        }))
    ),

  });

}


export function getCodebaseTexts() {

  return CODEBASE.files.map((file) => {

    let text = "";
    text += "/**\n";
    text += ` * File: ${file.fileName}\n`;
    text += ` * Folder: ${file.folderPath}\n`;
    text += ` * Updated: ${file.updatedAt}\n`;

    if (file.content.type === "link") {
      text += " * Type: Link\n";
      text += ` * Target: ${file.content.target}\n`;
    }

    if (file.content.type === "binary") {
      text += " * Type: Binary\n";
      text += ` * Size: ${file.content.size} bytes\n`;
    }

    if (file.content.type === "text") {
      text += " * Type: Text\n";
    }

    text += "*/\n";

    if (file.content.type === "text") {
      text += "\n";
      text += file.content.text;
    }

    return text;
  });

}
