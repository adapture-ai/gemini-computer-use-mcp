# @inkr/gemini-computer-use-mcp

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An MCP (Model Context Protocol) server for building browser-control agents using Gemini Computer Use. This project enables agents to plan and perform UI actions in a browser.

## ✨ Features

- **Computer Use (Browser Control):** Provides an MCP tool (`run_browser_task`) to instruct a browser to perform a high-level task using the Gemini Computer Use model.
- **Generative AI Integration:** Utilizes `@google/genai` for planning and executing computer-use steps.
- **Stdio Transport:** Communicates using the standard MCP stdio transport mechanism.

Learn more about Gemini Computer Use in the official docs: [Gemini Computer Use](https://ai.google.dev/gemini-api/docs/computer-use)

## 📚 Table of Contents

- [@inkr/gemini-computer-use-mcp](#inkrgemini-computer-use-mcp)
  - [✨ Features](#-features)
  - [📚 Table of Contents](#-table-of-contents)
  - [🚀 Usage](#-usage)
    - [Connecting an MCP Client](#connecting-an-mcp-client)
    - [Environment Variables](#environment-variables)
    - [Tools](#tools)
      - [`run_browser_task`](#run_browser_task)
  - [⚙️ Development](#️-development)
    - [Prerequisites](#prerequisites)
    - [Steps](#steps)
  - [💻 Technology Stack](#-technology-stack)
  - [📜 License](#-license)
  - [📧 Contact](#-contact)

## 🚀 Usage

This project runs as an MCP server. It's typically invoked by an MCP client or controller.

### Connecting an MCP Client

Point your MCP client to this server's executable. If your client supports a config file, use the `.mcp.json` in this repo as a reference and update environment variables as needed.

### Environment Variables

| Variable              | Description                                                      | Required                               | Default                                  |
| --------------------- | ---------------------------------------------------------------- | --------------------------------------- | ---------------------------------------- |
| `GEMINI_API_KEY`      | Your Gemini API key                                              | Yes, unless `VERTEX_PROJECT_KEY` is set |                                          |
| `VERTEX_PROJECT_KEY`  | Vertex AI project key (alternative to `GEMINI_API_KEY`)          | Yes, unless `GEMINI_API_KEY` is set     |                                          |
| `MODEL`               | The model ID to use                                              | No                                      | `gemini-2.5-computer-use-preview-10-2025`|
| `PROJECT_PATH`        | Filesystem path used by some tools (defaults to current working directory) | No                            | (current working directory)               |

Note: Either `GEMINI_API_KEY` or `VERTEX_PROJECT_KEY` must be provided (see `src/helpers/config.ts`).

### Tools

Once connected, the client can invoke the tools provided by this server.

#### `run_browser_task`

| Argument | Description                           | Required | Default |
| -------- | ------------------------------------- | -------- | ------- |
| `task`   | The high-level task to perform        | Yes      |         |

This tool leverages Gemini Computer Use to plan and perform UI actions to accomplish the provided task. See the official guidance for capabilities and safety considerations: [Gemini Computer Use](https://ai.google.dev/gemini-api/docs/computer-use).

## ⚙️ Development

### Prerequisites

- [Bun](https://bun.sh/)
- Git

### Steps

1. **Install dependencies:**

   ```bash
   bun install
   ```

2. **Configuration:**

   - Set `GEMINI_API_KEY` or `VERTEX_PROJECT_KEY`. Optionally set `MODEL` and `PROJECT_PATH`.

3. **Run:**
   - **In IDEs:** Reload window and check if the MCP is connected
   - **Manually:** Run `./run` in your terminal

## 💻 Technology Stack

- **Runtime:** [Bun](https://bun.sh/) / [Node.js](https://nodejs.org/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Core Libraries:**
  - [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk): For MCP server implementation.
  - [@google/genai](https://www.npmjs.com/package/@google/genai): For generative AI features.
  - [Zod](https://zod.dev/): For schema validation.
- **Development:** [@types/bun](https://www.npmjs.com/package/@types/bun), [TypeScript](https://www.npmjs.com/package/typescript)

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
Copyright (c) 2025 INKR Global

## 📧 Contact

- Khoa Nguyen @ [khoa@inkr.com](mailto:khoa@inkr.com)
- INKR Global @ [inkr.com](https://inkr.com)
