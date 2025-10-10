/* eslint-disable import/extensions */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { chromium, type Browser, type Page, type BrowserContext } from "playwright";

import { ai } from "../helpers/ai.ts";
import { MODEL } from "../helpers/config.ts";
import { logger } from "../helpers/logger.ts";
import { Environment } from "@google/genai";

// Screen dimensions
const SCREEN_WIDTH = 1440;
const SCREEN_HEIGHT = 900;

// Browser state
let browserInstance: Browser | null = null;
let contextInstance: BrowserContext | null = null;
let pageInstance: Page | null = null;

/**
 * Check if a browser is already running at the Chrome DevTools Protocol endpoint
 */
async function checkExistingBrowser(): Promise<string | null> {
  try {
    const response = await fetch("http://localhost:9222/json/version");
    if (response.ok) {
      const data = await response.json() as { webSocketDebuggerUrl?: string };
      return data.webSocketDebuggerUrl || null;
    }
  } catch (error) {
    // Browser not running
  }
  return null;
}

/**
 * Initialize or connect to browser
 */
async function getBrowser(): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
  if (browserInstance && contextInstance && pageInstance) {
    return { browser: browserInstance, context: contextInstance, page: pageInstance };
  }

  // Check if existing browser is running
  const wsEndpoint = await checkExistingBrowser();
  
  if (wsEndpoint) {
    await logger.info("Connecting to existing browser at localhost:9222");
    browserInstance = await chromium.connectOverCDP("http://localhost:9222");
    contextInstance = browserInstance.contexts()[0] || await browserInstance.newContext({
      viewport: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
    });
    pageInstance = contextInstance.pages()[0] || await contextInstance.newPage();
  } else {
    await logger.info("Starting new browser instance");
    browserInstance = await chromium.launch({
      headless: false,
      args: ['--remote-debugging-port=9222'],
    });
    contextInstance = await browserInstance.newContext({
      viewport: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
    });
    pageInstance = await contextInstance.newPage();
  }

  return { browser: browserInstance, context: contextInstance, page: pageInstance };
}

/**
 * Capture screenshot and return as base64
 */
async function captureScreenshot(page: Page): Promise<string> {
  const screenshot = await page.screenshot({ type: "png" });
  return screenshot.toString("base64");
}

/**
 * Execute computer use action
 */
async function executeAction(page: Page, functionCall: any): Promise<string> {
  const { name, args: actionArgs } = functionCall;

  try {
    switch (name) {
      case "computer_mouse_move": {
        const { x, y } = actionArgs;
        await page.mouse.move(x, y);
        return `Moved mouse to (${x}, ${y})`;
      }

      case "computer_mouse_click": {
        const { button = "left", click_count = 1 } = actionArgs;
        await page.mouse.click(0, 0, { button, clickCount: click_count });
        return `Clicked ${button} button ${click_count} time(s)`;
      }

      case "computer_keyboard_type": {
        const { text } = actionArgs;
        await page.keyboard.type(text);
        return `Typed: ${text}`;
      }

      case "computer_keyboard_press_key": {
        const { key } = actionArgs;
        await page.keyboard.press(key);
        return `Pressed key: ${key}`;
      }

      case "computer_screenshot": {
        // Screenshot is captured automatically in the loop
        return "Screenshot captured";
      }

      case "computer_wait": {
        const { duration = 1 } = actionArgs;
        await page.waitForTimeout(duration * 1000);
        return `Waited ${duration} second(s)`;
      }

      case "computer_get_text": {
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        const text = await page.evaluate(() => document.body.innerText);
        return text;
      }

      case "computer_get_url": {
        const url = page.url();
        return url;
      }

      case "computer_scroll": {
        const { direction = "down", amount = 100 } = actionArgs;
        const scrollAmount = direction === "down" ? amount : -amount;
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        await page.evaluate((scroll) => window.scrollBy(0, scroll), scrollAmount);
        return `Scrolled ${direction} by ${amount}px`;
      }

      default:
        return `Unknown action: ${name}`;
    }
  } catch (error) {
    await logger.error(`Error executing action ${name}:`, error);
    throw error;
  }
}

/**
 * Main agent loop
 */
async function runAgentLoop(page: Page, task: string, signal: AbortSignal): Promise<string> {
  const conversationHistory: any[] = [];
  let iterationCount = 0;
  const maxIterations = 50; // Prevent infinite loops

  // Add initial user task
  conversationHistory.push({
    role: "user",
    parts: [{ text: task }],
  });

  while (iterationCount < maxIterations) {
    signal.throwIfAborted();
    iterationCount++;
    
    await logger.info(`Iteration ${iterationCount}: Processing...`);

    // Capture current screenshot
    const screenshot = await captureScreenshot(page);
    const currentUrl = page.url();

    // Add screenshot to conversation
    conversationHistory.push({
      role: "user",
      parts: [
        {
          inline_data: {
            mime_type: "image/png",
            data: screenshot,
          },
        },
        { text: `Current URL: ${currentUrl}` },
      ],
    });

    // Send request to model with Computer Use tool
    const response = await ai.models.generateContent({
      model: MODEL,
      config: {
        tools: [
          {
            computerUse: {
              environment: Environment.ENVIRONMENT_BROWSER,
            },
          },
        ],
      },
      contents: conversationHistory,
    });

    const candidate = response.candidates?.[0];
    if (!candidate || !candidate.content || !candidate.content.parts) {
      throw new Error("No candidate or content in response");
    }

    // Add model response to history
    conversationHistory.push({
      role: "model",
      parts: candidate.content.parts,
    });

    // Check for function calls
    const functionCalls = candidate.content.parts.filter((part: any) => part.functionCall);
    
    if (functionCalls.length === 0) {
      // No more actions, task complete
      const textParts = candidate.content.parts.filter((part: any) => part.text);
      const finalText = textParts.map((part: any) => part.text).join("\n");
      await logger.info("Task completed");
      return finalText || "Task completed successfully";
    }

    // Execute all function calls
    const functionResponses: any[] = [];
    
    for (const part of candidate.content.parts) {
      if ((part as any).functionCall) {
        const functionCall = (part as any).functionCall;
        await logger.info(`Executing action: ${functionCall.name}`);
        
        try {
          const result = await executeAction(page, functionCall);
          functionResponses.push({
            functionResponse: {
              name: functionCall.name,
              response: { result },
            },
          });
          
          // Wait a bit for UI to update
          await page.waitForTimeout(500);
        } catch (error) {
          functionResponses.push({
            functionResponse: {
              name: functionCall.name,
              response: { error: String(error) },
            },
          });
        }
      }
    }

    // Add function responses to conversation
    if (functionResponses.length > 0) {
      conversationHistory.push({
        role: "user",
        parts: functionResponses,
      });
    }
  }

  throw new Error("Max iterations reached without completing task");
}

export function addRunBrowserTaskTool(server: McpServer) {

  server.tool(

    // Name
    "run_browser_task",

    // Description
    "Control browser to perform a task using Gemini Computer Use",

    // Params Schema
    {
      task: z.string().describe("The task to perform in the browser"),
    },

    // Callback
    async (args, extra) => {

      try {

        const {
          task,
        } = args;

        const {
          signal,
        } = extra;

        signal.throwIfAborted();

        await logger.info(`Starting browser task: ${task}`);
        const tb0 = Date.now();
        
        // Get or create browser
        const { page } = await getBrowser();

        // Run agent loop
        const result = await runAgentLoop(page, task, signal);
        
        const tb2 = Date.now();
        await logger.info("Task completed in", ((tb2 - tb0) / 1000.0).toFixed(1), "seconds.");

        signal.throwIfAborted();

        return {
          content: [{
            type: "text",
            text: result,
          }],
        };
        
      } catch (error) {

        await logger.error("[run_browser_task]", error);

        throw error;
      }

    },

  );

}
