import { ChatSession, GoogleGenerativeAI } from "@google/generative-ai";
import type { FastMCP } from "fastmcp";
import { existsSync } from "fs";
import { appendFile, mkdir, unlink, writeFile } from "fs/promises";
import { z } from "zod";

import { getCodebaseTexts } from "../resources/getCodebaseResource";


let getChatSessionPromise: Promise<{
  chatSession: ChatSession;
  codebaseFile: string;
  codebaseResponseFile: string;
}> | null = null;


async function getChatSession() {

  getChatSessionPromise ??= (async () => {

    const codebaseFolder = `${Bun.env.CODEBASE_PATH}/.codebase`;
    if (!existsSync(codebaseFolder)) {
      await mkdir(codebaseFolder, { recursive: true });
    }

    const codebaseFile = `${codebaseFolder}/codebase.log`;
    if (existsSync(codebaseFile)) {
      await unlink(codebaseFile);
    }

    const codebaseResponseFile = `${codebaseFolder}/codebase-response.log`;
    if (existsSync(codebaseResponseFile)) {
      await unlink(codebaseResponseFile);
    }

    const apiKey = Bun.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY environment variable is not set");
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      systemInstruction: `
        You are a helpful assistant that answers questions about the codebase.
        The first message will be the codebase, just say 'OK' when you receive it. Do not say anything else.
        From the second message onwards, each message will be a question. Answer those questions based on the codebase you received in the first message.
      `,
    });

    const chatSession = model.startChat();

    const texts = getCodebaseTexts().join("\n\n");
    await writeFile(codebaseFile, texts, "utf-8");

    await appendFile(codebaseResponseFile, `${new Date().toISOString()} Request:\n`, "utf-8");
    await appendFile(codebaseResponseFile, `${new Date().toISOString()} (Sending ${texts.split("\n").length} lines of codebase...)\n\n`, "utf-8");
    const t0 = Date.now();
    const response1 = await chatSession.sendMessage(texts);
    const t1 = Date.now();
    await appendFile(codebaseResponseFile, `${new Date().toISOString()} Response:\n`, "utf-8");
    await appendFile(codebaseResponseFile, `${new Date().toISOString()} ${response1.response.text()}`, "utf-8");
    await appendFile(codebaseResponseFile, `${new Date().toISOString()} (Took ${((t1 - t0) / 1000.0).toFixed(1)}) seconds.\n\n`, "utf-8");

    return {
      chatSession: chatSession,
      codebaseFile: codebaseFile,
      codebaseResponseFile: codebaseResponseFile,
    };

  })();

  const result = await getChatSessionPromise;
  return result;
}


export function addAskCodebaseTool<T extends Record<string, unknown> | undefined>(server: FastMCP<T>) {

  server.addTool({

    name: "Ask Codebase",
    description: "Ask a question about the codebase",

    parameters: z.object({
      question: z.string(),
    }),

    execute: async (args, context) => {

      const {
        question,
      } = args;

      const {
        session,
        log,
        reportProgress,
      } = context;

      log.info("Session ID:", `${session?.id}`);
      log.info("Question:", question);

      await reportProgress({
        progress: 0,
        total: 100,
      });

      const {
        chatSession,
        codebaseResponseFile,
      } = await getChatSession();

      await reportProgress({
        progress: 50,
        total: 100,
      });

      await appendFile(codebaseResponseFile, `${new Date().toISOString()} Request:\n`, "utf-8");
      await appendFile(codebaseResponseFile, `${new Date().toISOString()} ${question}\n\n`, "utf-8");
      const t0 = Date.now();
      const response2 = await chatSession.sendMessage(question);
      const t1 = Date.now();
      const text = response2.response.text();
      await appendFile(codebaseResponseFile, `${new Date().toISOString()} Response:\n`, "utf-8");
      await appendFile(codebaseResponseFile, `${new Date().toISOString()} ${text}`, "utf-8");
      await appendFile(codebaseResponseFile, `${new Date().toISOString()} (Took ${((t1 - t0) / 1000.0).toFixed(1)}) seconds.\n\n`, "utf-8");

      await reportProgress({
        progress: 100,
        total: 100,
      });

      return text;
    },

  });

}
