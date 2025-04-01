import { GoogleGenerativeAI } from "@google/generative-ai";
import type { FastMCP } from "fastmcp";
import { z } from "zod";


export function addAskCodebaseTool<T extends Record<string, unknown> | undefined>(server: FastMCP<T>) {

  server.addTool({

    name: "Ask",
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

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is not set");
      }

      const genAI = new GoogleGenerativeAI(apiKey);

      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-pro",
      });

      const chatSession = model.startChat({
      });

      await chatSession.sendMessage(question);

      // const { candidates } = result.response;
      // for (let candidate_index = 0; candidate_index < candidates.length; candidate_index++) {
      //   for (let part_index = 0; part_index < candidates[candidate_index].content.parts.length; part_index++) {
      //     const part = candidates[candidate_index].content.parts[part_index];
      //     if (part.inlineData) {
      //       try {
      //         const filename = `output_${candidate_index}_${part_index}.${mime.extension(part.inlineData.mimeType)}`;
      //         fs.writeFileSync(filename, Buffer.from(part.inlineData.data, "base64"));
      //         console.log(`Output written to: ${filename}`);
      //       } catch (err) {
      //         console.error(err);
      //       }
      //     }
      //   }
      // }

      await reportProgress({
        progress: 100,
        total: 100,
      });

      return "Hello world!";
    },

  });

}
