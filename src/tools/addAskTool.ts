import type { FastMCP } from "fastmcp";
import { z } from "zod";


export function addAskTool<T extends Record<string, unknown> | undefined>(server: FastMCP<T>) {

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

      // const {
      //   GoogleGenerativeAI,
      //   HarmCategory,
      //   HarmBlockThreshold,
      // } = require("@google/generative-ai");
      // const fs = require("node:fs");
      // const mime = require("mime-types");

      // const apiKey = process.env.GEMINI_API_KEY;
      // const genAI = new GoogleGenerativeAI(apiKey);

      // const model = genAI.getGenerativeModel({
      //   model: "gemini-1.5-pro",
      // });

      // const generationConfig = {
      //   temperature: 1,
      //   topP: 0.95,
      //   topK: 40,
      //   maxOutputTokens: 8192,
      //   responseModalities: [
      //   ],
      //   responseMimeType: "text/plain",
      // };

      // async function run() {
      //   const chatSession = model.startChat({
      //     generationConfig,
      //     history: [
      //     ],
      //   });

      //   const result = await chatSession.sendMessage("INSERT_INPUT_HERE");
      //   // TODO: Following code needs to be updated for client-side apps.
      //   const candidates = result.response.candidates;
      //   for(let candidate_index = 0; candidate_index < candidates.length; candidate_index++) {
      //     for(let part_index = 0; part_index < candidates[candidate_index].content.parts.length; part_index++) {
      //       const part = candidates[candidate_index].content.parts[part_index];
      //       if(part.inlineData) {
      //         try {
      //           const filename = `output_${candidate_index}_${part_index}.${mime.extension(part.inlineData.mimeType)}`;
      //           fs.writeFileSync(filename, Buffer.from(part.inlineData.data, 'base64'));
      //           console.log(`Output written to: ${filename}`);
      //         } catch (err) {
      //           console.error(err);
      //         }
      //       }
      //     }
      //   }
      //   console.log(result.response.text());
      // }

      // run();

      await reportProgress({
        progress: 100,
        total: 100,
      });

      return "Hello world!";
    },

  });

}
