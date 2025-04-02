/* eslint-disable import/extensions */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { existsSync } from "fs";
import { appendFile, mkdir, unlink } from "fs/promises";
import { dirname } from "path";

import { CODEBASE_PATH } from "./config";


const filePath = `${CODEBASE_PATH}/.codebase/logger.log`;

const folderPath = dirname(filePath);
if (!existsSync(folderPath)) {
  await mkdir(folderPath, { recursive: true });
}

if (existsSync(filePath)) {
  await unlink(filePath);
}


class Logger {


  private server: McpServer | undefined;

  setServer(server: McpServer) {
    this.server = server;
  }


  async log(level: "debug" | "info" | "warning" | "error", ...messages: unknown[]) {

    await Promise.all([

      (async () => {
        let line = `[${new Date().toISOString()}] [${level.toUpperCase()}]`;
        for (const message of messages) {
          const messageString = typeof message === "string" ? message.replace(/\n$/, "") : JSON.stringify(message);
          line += ` ${messageString}`;
        }
        await appendFile(filePath, `${line}\n`, "utf-8");
      })(),

      Promise.all(messages.map(async (message) => {
        await this.server?.server.sendLoggingMessage({
          logger: "logger",
          level: level,
          data: message,
        });
      })),

    ]);

  }


  async debug(...messages: unknown[]) {
    await this.log("debug", ...messages);
  }

  async info(...messages: unknown[]) {
    await this.log("info", ...messages);
  }

  async warn(...messages: unknown[]) {
    await this.log("warning", ...messages);
  }

  async error(...messages: unknown[]) {
    await this.log("error", ...messages);
  }


}


export const logger = new Logger();
