/* eslint-disable import/extensions */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { chromium, type Browser, type Page, type BrowserContext } from "playwright";

import { ai } from "../helpers/ai.ts";
import { MODEL } from "../helpers/config.ts";
import { logger } from "../helpers/logger.ts";
import { Environment, type Content, type ContentListUnion, type GenerateContentParameters, type Part } from "@google/genai";
import { extractResourceMetadataUrl } from "@modelcontextprotocol/sdk/client/auth.js";

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
    return { 
      browser: browserInstance, 
      context: contextInstance, 
      page: pageInstance,
    };
  }

  let lastError;

  for (let i = 0; i < 10; i++) {
    try {

      // Check if existing browser is running
      const wsEndpoint = await checkExistingBrowser();

      await logger.info("[getBrowser]", "Connecting to existing browser at localhost:9222...");
      browserInstance = (
        browserInstance || 
        (wsEndpoint ? 
          await chromium.connectOverCDP(wsEndpoint) : 
          await chromium.launch({
            headless: false,
            args: ["--remote-debugging-port=9222"],
          })
        )
      );

      contextInstance = (
        contextInstance || 
        browserInstance.contexts()[0] || 
        await browserInstance.newContext({
          viewport: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
        })
      );

      const pages = contextInstance.pages();
      pageInstance = (
        pageInstance ||
        pages[pages.length - 1] || 
        await contextInstance.newPage()
      );

      pageInstance.setViewportSize({ 
        width: SCREEN_WIDTH, 
        height: SCREEN_HEIGHT,
      });

      pageInstance.goto("about:blank", { waitUntil: "domcontentloaded" });

      return { 
        browser: browserInstance, 
        context: contextInstance, 
        page: pageInstance,
      };

    } catch (error) {

      lastError = error;
      
      await logger.error("[getBrowser]", "Error getting browser:", error);

      pageInstance = null;

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

  }

  throw lastError;
}

/**
 * Capture screenshot and return as base64
 */
async function captureScreenshot(page: Page): Promise<string> {
  const screenshot = await page.screenshot({ 
    type: "jpeg", 
    quality: 80,
    path: "/tmp/screenshot.jpeg",
  });
  return screenshot.toString("base64");
}

/**
 * Action execution helpers
 */

type FunctionCall = {
  name: string;
  args?: Record<string, unknown>;
};

type ActionExecutionResult = {
  status: "success" | "skipped";
  message: string;
  data?: Record<string, unknown>;
  safetyAcknowledged?: boolean;
};

function toNumber(value: unknown, fallback?: number): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (typeof parsed === "number" && Number.isFinite(parsed)) {
    return parsed;
  }
  if (fallback !== undefined) {
    return fallback;
  }
  throw new Error(`Expected numeric value but received: ${String(value)}`);
}

function denormalize(value: number, max: number): number {
  if (Number.isNaN(value)) {
    throw new Error("Coordinate value is NaN");
  }

  // Treat 0-1000 range as normalized. If value already looks like pixels, clamp directly.
  if (value <= 1000) {
    const ratio = Math.min(Math.max(value, 0), 1000) / 1000;
    return Math.round(ratio * max);
  }

  return Math.round(Math.min(Math.max(value, 0), max));
}

function denormalizeX(value: unknown): number {
  return denormalize(toNumber(value), SCREEN_WIDTH);
}

function denormalizeY(value: unknown): number {
  return denormalize(toNumber(value), SCREEN_HEIGHT);
}

function modifierKey(): "Control" | "Meta" {
  return process.platform === "darwin" ? "Meta" : "Control";
}

async function executeAction(page: Page, functionCall: FunctionCall): Promise<ActionExecutionResult> {
  const { name } = functionCall;
  const rawArgs = functionCall.args || {};
  const { safety_decision: safetyDecision, ...actionArgs } = rawArgs as Record<string, unknown> & {
    safety_decision?: { decision?: string; explanation?: string };
  };

  if (safetyDecision && safetyDecision.decision === "require_confirmation") {
    return {
      status: "skipped",
      message: `Action '${name}' requires confirmation before execution: ${safetyDecision.explanation || "confirmation required"}`,
      data: {
        safety_decision: safetyDecision,
      },
    };
  }

  try {
    switch (name) {
      case "open_web_browser": {
        // Browser already open; ensure page has a valid context
        return {
          status: "success",
          message: "Browser ready",
        };
      }

      case "navigate": {
        const url = String(actionArgs.url || "");
        if (!url) {
          throw new Error("Missing 'url' argument for navigate action");
        }
        await page.goto(url, { waitUntil: "domcontentloaded" });
        return {
          status: "success",
          message: `Navigated to ${url}`,
          data: { url },
        };
      }

      case "search": {
        const url = "https://www.google.com/";
        await page.goto(url, { waitUntil: "domcontentloaded" });
        return {
          status: "success",
          message: "Opened default search engine",
          data: { url },
        };
      }

      case "click_at": {
        const x = denormalizeX(actionArgs.x);
        const y = denormalizeY(actionArgs.y);
        // const x = actionArgs.x as number;
        // const y = actionArgs.y as number;
        logger.info("[executeAction]", "click_at", { x, y });
        const button = (actionArgs.button as string) || "left";
        const clickCount = actionArgs.click_count ? toNumber(actionArgs.click_count) : 1;

        await page.mouse.move(x, y);
        await page.mouse.click(x, y, { button: button as "left" | "right" | "middle", clickCount });

        return {
          status: "success",
          message: `Clicked ${button} at (${x}, ${y})`,
          data: { x, y, button, click_count: clickCount },
        };
      }

      case "hover_at": {
        const x = denormalizeX(actionArgs.x);
        const y = denormalizeY(actionArgs.y);
        // const x = actionArgs.x as number;
        // const y = actionArgs.y as number;
        await page.mouse.move(x, y);
        return {
          status: "success",
          message: `Hovered at (${x}, ${y})`,
          data: { x, y },
        };
      }

      case "type_text_at": {
        const x = denormalizeX(actionArgs.x);
        const y = denormalizeY(actionArgs.y);
        // const x = actionArgs.x as number;
        // const y = actionArgs.y as number;
        const text = typeof actionArgs.text === "string" ? actionArgs.text : "";
        const pressEnter = actionArgs.press_enter !== undefined ? Boolean(actionArgs.press_enter) : true;
        const clearBeforeTyping = actionArgs.clear_before_typing !== undefined ? Boolean(actionArgs.clear_before_typing) : true;

        await page.mouse.move(x, y);
        await page.mouse.click(x, y);

        if (clearBeforeTyping) {
          await page.keyboard.press(`${modifierKey()}+A`);
          await page.keyboard.press("Backspace");
        }

        if (text) {
          await page.keyboard.type(text);
        }

        if (pressEnter) {
          await page.keyboard.press("Enter");
        }

        return {
          status: "success",
          message: `Typed '${text}' at (${x}, ${y})`,
          data: { x, y, text, press_enter: pressEnter },
        };
      }

      case "key_combination": {
        const keys = String(actionArgs.keys || "");
        if (!keys) {
          throw new Error("Missing 'keys' argument for key_combination action");
        }
        await page.keyboard.press(keys);
        return {
          status: "success",
          message: `Pressed key combination ${keys}`,
          data: { keys },
        };
      }

      case "scroll_document": {
        const direction = String(actionArgs.direction || "down").toLowerCase();
        const magnitude = actionArgs.magnitude ? toNumber(actionArgs.magnitude) : 800;
        let deltaX = 0;
        let deltaY = 0;
        switch (direction) {
          case "up":
            deltaY = -Math.abs(magnitude);
            break;
          case "down":
            deltaY = Math.abs(magnitude);
            break;
          case "left":
            deltaX = -Math.abs(magnitude);
            break;
          case "right":
            deltaX = Math.abs(magnitude);
            break;
          default:
            throw new Error(`Unsupported scroll direction: ${direction}`);
        }

        await page.mouse.wheel(deltaX, deltaY);

        return {
          status: "success",
          message: `Scrolled document ${direction} (${deltaX}, ${deltaY})`,
          data: { direction, magnitude },
        };
      }

      case "scroll_at": {
        const x = denormalizeX(actionArgs.x);
        const y = denormalizeY(actionArgs.y);
        // const x = actionArgs.x as number;
        // const y = actionArgs.y as number;
        const direction = String(actionArgs.direction || "down").toLowerCase();
        const magnitude = actionArgs.magnitude ? toNumber(actionArgs.magnitude) : 800;

        await page.mouse.move(x, y);

        const deltaX = direction === "left" ? -Math.abs(magnitude) : direction === "right" ? Math.abs(magnitude) : 0;
        const deltaY = direction === "up" ? -Math.abs(magnitude) : direction === "down" ? Math.abs(magnitude) : 0;

        if (deltaX === 0 && deltaY === 0) {
          throw new Error(`Unsupported scroll direction: ${direction}`);
        }

        await page.mouse.wheel(deltaX, deltaY);

        return {
          status: "success",
          message: `Scrolled at (${x}, ${y}) ${direction}`,
          data: { x, y, direction, magnitude },
        };
      }

      case "drag_and_drop": {
        const x = denormalizeX(actionArgs.x);
        const y = denormalizeY(actionArgs.y);
        // const x = actionArgs.x as number;
        // const y = actionArgs.y as number;
        const destinationX = denormalizeX(actionArgs.destination_x ?? actionArgs.destinationX);
        const destinationY = denormalizeY(actionArgs.destination_y ?? actionArgs.destinationY);
        // const destinationX = (actionArgs.destination_x ?? actionArgs.destinationX) as number;
        // const destinationY = (actionArgs.destination_y ?? actionArgs.destinationY) as number;

        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(destinationX, destinationY, { steps: 20 });
        await page.mouse.up();

        return {
          status: "success",
          message: `Dragged from (${x}, ${y}) to (${destinationX}, ${destinationY})`,
          data: { x, y, destination_x: destinationX, destination_y: destinationY },
        };
      }

      case "go_back": {
        await page.goBack();
        return {
          status: "success",
          message: "Navigated back",
          data: { url: page.url() },
        };
      }

      case "go_forward": {
        await page.goForward();
        return {
          status: "success",
          message: "Navigated forward",
          data: { url: page.url() },
        };
      }

      default: {
        const waitMatch = /^wait_(\d+)_seconds$/i.exec(name);
        if (waitMatch) {
          const seconds = Number(waitMatch[1]);
          await page.waitForTimeout(seconds * 1000);
          return {
            status: "success",
            message: `Waited ${seconds} second(s)`,
            data: { seconds },
          };
        }

        if (name === "wait" || name === "wait_seconds" || name === "wait_for_seconds") {
          const seconds = actionArgs.seconds ? toNumber(actionArgs.seconds) : actionArgs.duration ? toNumber(actionArgs.duration) : 1;
          await page.waitForTimeout(seconds * 1000);
          return {
            status: "success",
            message: `Waited ${seconds} second(s)`,
            data: { seconds },
          };
        }

        throw new Error(`Unknown or unsupported action: ${name}`);
      }
    }
  } catch (error) {
    await logger.error("[executeAction]", `Error executing action ${name}:`, error);
    throw error;
  }
}

/**
 * Main agent loop
 */
async function runAgentLoop(page: Page, task: string, signal: AbortSignal): Promise<string> {
  let taskAdded = false;
  const conversationHistory: Content[] = [];
  let iterationCount = 0;
  const maxIterations = 50; // Prevent infinite loops

  while (iterationCount < maxIterations) {
    signal.throwIfAborted();
    iterationCount++;
    
    await logger.info("[runAgentLoop]", `Iteration ${iterationCount}: Processing...`);

    // Capture current screenshot
    const screenshot = await captureScreenshot(page);
    const currentUrl = page.url();

    // Add screenshot to conversation
    conversationHistory.push({
      role: "user",
      parts: [
        { text: (taskAdded ? "" : `${task}. `) + `Current URL: ${currentUrl}` },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: screenshot,
          },
        },
      ],
    });
    for (const part of conversationHistory[conversationHistory.length - 1]?.parts || []) {
      if (!part.text) continue;
      await logger.info("[runAgentLoop]", "User:", part.text);
    }

    taskAdded = true;

    // Send request to model with Computer Use tool
    const request: GenerateContentParameters = {
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
    };
    // await logger.info("[runAgentLoop]", "request", JSON.stringify(request, null, 2).replace(/"data": "[^"]*"/g, '"data": "[Base64 Data]"'));
    
    const response = await ai.models.generateContent(request);
    // await logger.info("[runAgentLoop]", "response", JSON.stringify(response, null, 2).replace(/"data": "[^"]*"/g, '"data": "[Base64 Data]"'));

    if (response.promptFeedback) {
      throw new Error(`[Gemini] Prompt feedback: ${response.promptFeedback.blockReasonMessage} (${response.promptFeedback.blockReason})`);
    }

    const candidate = response.candidates?.[0];
    if (!candidate || !candidate.content || !candidate.content.parts) {
      throw new Error("[Gemini] Empty response");
    }

    // Add model response to history
    conversationHistory.push({
      role: "model",
      parts: candidate.content.parts,
    });
    for (const part of conversationHistory[conversationHistory.length - 1]?.parts || []) {
      if (!part.text) continue;
      await logger.info("[runAgentLoop]", "Model:", part.text);
    }

    // Check for function calls
    const functionCalls = candidate.content.parts.filter((part: any) => part.functionCall);
    
    if (functionCalls.length === 0) {
      // No more actions, task complete
      const textParts = candidate.content.parts.filter((part: any) => part.text);
      const finalText = textParts.map((part: any) => part.text).join("\n");
      await logger.info("[runAgentLoop]", "Task completed");
      return finalText || "Task completed successfully";
    }

    // Execute all function calls
    const functionResponses: Part[] = [];

    let requiresConfirmation = false;
    
    let lastMessage = "";

    for (const part of candidate.content.parts) {
      if ((part as any).functionCall) {
        const functionCall = (part as any).functionCall as FunctionCall;
        await logger.info("[runAgentLoop]", `Executing action: ${functionCall.name}`, JSON.stringify(functionCall, null, 2).replace(/"data": "[^"]*"/g, '"data": "[Base64 Data]"'));

        let responsePayload: Record<string, unknown> = {};

        try {
          const result = await executeAction(page, functionCall);
          lastMessage = result.message;
          if (result.status === "skipped") {
            requiresConfirmation = true;
          }

          const screenshotAfterAction = await captureScreenshot(page);
          responsePayload = {
            status: result.status,
            message: result.message,
            url: page.url(),
            ...(result.data || {}),
          };

          if (result.safetyAcknowledged) {
            responsePayload.safety_acknowledgement = "true";
          }

          functionResponses.push({
            functionResponse: {
              name: functionCall.name,
              response: {
                ...responsePayload,
                ...(requiresConfirmation && {
                  safetyAcknowledgement: "true",
                  safety_acknowledgement: "true",
                }),
              },
              parts: [
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: screenshotAfterAction,
                  },
                },
              ],
            },
          });

          if (requiresConfirmation) {
            break;
          }

          // Allow UI to settle before processing next action
          await page.waitForTimeout(500);
        } catch (error) {
          const screenshotAfterError = await captureScreenshot(page);
          responsePayload = {
            status: "error",
            error: String(error),
            url: page.url(),
          };

          functionResponses.push({
            functionResponse: {
              name: functionCall.name,
              response: responsePayload,
              parts: [
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: screenshotAfterError,
                  },
                },
              ],
            },
          });

          lastMessage = `Error executing ${functionCall.name}: ${String(error)}`;
        }
      }
    }

    // Add function responses to conversation
    if (functionResponses.length > 0) {
      conversationHistory.push({
        role: "user",
        parts: functionResponses,
      });
      for (const part of conversationHistory[conversationHistory.length - 1]?.parts || []) {
        if (!part.text) continue;
        await logger.info("[runAgentLoop]", "User:", part.text);
      }
    }

    // if (requiresConfirmation) {
    //   await logger.warn("[runAgentLoop]", "Halting agent loop pending user confirmation");
    //   return lastMessage || "Action requires user confirmation";
    // }
  }

  throw new Error("[runAgentLoop] Max iterations reached without completing task");
}

export function registerRunBrowserTaskTool(server: McpServer) {

  server.registerTool(

    // Name
    "run_browser_task",

    {
      title: "Run Browser Task",
      description: "Control browser to perform a task using Gemini Computer Use",
      inputSchema: {
        task: z.string().describe("The task to perform in the browser"),
      },
      outputSchema: {
        text: z.string().describe("The result of the task"),
      },
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

        await logger.info("[run_browser_task]", `Starting browser task: ${task}`);
        const tb0 = Date.now();
        
        // Get or create browser
        const { page } = await getBrowser();

        // Run agent loop
        const result = await runAgentLoop(page, task, signal);
        
        const tb2 = Date.now();
        await logger.info("[run_browser_task]", "Task completed in", ((tb2 - tb0) / 1000.0).toFixed(1), "seconds.");

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
