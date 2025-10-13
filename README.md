# @inkr/gemini-computer-use-mcp

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An MCP (Model Context Protocol) server for building browser-control agents using Gemini Computer Use. This project enables agents to plan and perform UI actions in a browser.

## ✨ Features

- **Computer Use (Browser Control):** Provides an MCP tool (`run_browser_task`) to instruct a browser to perform a high-level task using the Gemini Computer Use model.
- **Generative AI Integration:** Utilizes `@google/genai` for planning and executing computer-use steps.
- **stdio Transport:** Communicates using the standard MCP stdio transport mechanism.

Learn more about Gemini Computer Use in the official docs: [Gemini Computer Use](https://ai.google.dev/gemini-api/docs/computer-use)

## 📚 Table of Contents

- [@inkr/gemini-computer-use-mcp](#inkrgemini-computer-use-mcp)
  - [✨ Features](#-features)
  - [📚 Table of Contents](#-table-of-contents)
  - [🚀 Usage](#-usage)
    - [Connecting an MCP Client](#connecting-an-mcp-client)
      - [stdio Mode](#stdio-mode)
      - [SSE Mode](#sse-mode)
      - [Streamable HTTP Mode](#streamable-http-mode)
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

Point your MCP client to this server's executable. If your client supports a config file, use the following configs:

#### stdio Mode

```JSON
{
  "mcpServers": {
    "gemini-computer-use": {
      "type": "stdio",
      "timeout": 300,
      "command": "npx",
      "args": ["--yes", "@inkr/gemini-computer-use-mcp@latest"],
      "env": {
        "VERTEX_PROJECT_KEY": "vertex-project-key"
      }
    }
  }
}
```

#### SSE Mode

Start server with `VERTEX_PROJECT_KEY=vertex-project-key npx --yes @inkr/gemini-computer-use-mcp@latest --server`.

```JSON
{
  "mcpServers": {
    "gemini-computer-use": {
      "type": "sse",
      "timeout": 300,
      "url": "http://localhost:8888/sse"
    }
  }
}
```

#### Streamable HTTP Mode

Start server with `VERTEX_PROJECT_KEY=vertex-project-key npx --yes @inkr/gemini-computer-use-mcp@latest --server`.

```JSON
{
  "mcpServers": {
    "gemini-computer-use": {
      "type": "http",
      "timeout": 300,
      "url": "http://localhost:8888/mcp"
    }
  }
}
```

### Environment Variables

| Variable              | Description                                                                | Required                                | Default                                  |
| --------------------- | -------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------- |
| `VERTEX_PROJECT_KEY`  | Vertex AI project key (preferred over `GEMINI_API_KEY`)                    | Yes, unless `GEMINI_API_KEY` is set     |                                          |
| `GEMINI_API_KEY`      | Your Gemini API key                                                        | Yes, unless `VERTEX_PROJECT_KEY` is set |                                          |
| `MODEL`               | The model ID to use                                                        | No                                      | `gemini-2.5-computer-use-preview-10-2025`|
| `PROJECT_PATH`        | Filesystem path used by some tools (defaults to current working directory) | No                                      | (current working directory)              |
| `PORT`                | Server port to use (only for streamable HTTP)                              | No                                      | 8888                                     |

Note: Either `GEMINI_API_KEY` or `VERTEX_PROJECT_KEY` must be provided (see `src/helpers/config.ts`).

### Tools

Once connected, the client can invoke the tools provided by this server.

#### `run_browser_task`

| Argument   | Description                                      | Required | Default        |
| ---------- | ------------------------------------------------ | -------- | -------------- |
| `task`     | The high-level task to perform                   | Yes      |                |
| `startUrl` | Optional starting URL for the browser            | No       | `about:blank`  |

This tool leverages Gemini Computer Use to plan and perform UI actions to accomplish the provided task. It implements:

- **Automatic browser management:** Checks for existing browser at `localhost:9222` or starts a new instance
- **Agent loop:** Continuously captures screenshots, sends them to Gemini, receives UI actions, and executes them
- **All supported UI actions:** mouse movement, clicks, keyboard input, scrolling, text extraction, and more
- **Safety guidelines:** Follows Gemini's safety best practices from the official documentation

See the official guidance for capabilities and safety considerations: [Gemini Computer Use](https://ai.google.dev/gemini-api/docs/computer-use).

## ⚙️ Development

### Prerequisites

- Git

### Steps

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configuration:**

   - Set `GEMINI_API_KEY` or `VERTEX_PROJECT_KEY`. Optionally set `MODEL` and `PROJECT_PATH`.

3. **Run:**
   - **In IDEs:** Reload window and check if the MCP is connected
   - **Manually:** Run `./run` in your terminal

## 💻 Technology Stack

- **Runtime:** [Node.js](https://nodejs.org/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Core Libraries:**
  - [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk): For MCP server implementation.
  - [@google/genai](https://www.npmjs.com/package/@google/genai): For generative AI features.
  - [Zod](https://zod.dev/): For schema validation.
- **Development:** [@types/node](https://www.npmjs.com/package/@types/node), [TypeScript](https://www.npmjs.com/package/typescript)

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
Copyright (c) 2025 INKR Global

## 📧 Contact

- Khoa Nguyen @ [khoa@inkr.com](mailto:khoa@inkr.com)
- INKR Global @ [inkr.com](https://inkr.com)
