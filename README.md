# @inkr/gemini-computer-use-mcp

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An MCP (Model Context Protocol) server designed to provide tools for interacting with codebases, leveraging generative AI capabilities. This server allows AI agents or other MCP clients to ask questions about a specified codebase path.

## ✨ Features

- **Codebase Interaction:** Provides an MCP tool (`ask_codebase`) to query information about codebases.
- **Generative AI Integration:** Utilizes `@google/genai` for processing and answering codebase-related questions.
- **Stdio Transport:** Communicates using the standard MCP stdio transport mechanism.

## 📚 Table of Contents

- [@inkr/gemini-computer-use-mcp](#inkrgemini-computer-use-mcp)
  - [✨ Features](#-features)
  - [📚 Table of Contents](#-table-of-contents)
  - [🚀 Usage](#-usage)
    - [Connecting an MCP Client](#connecting-an-mcp-client)
    - [Environment Variables](#environment-variables)
    - [Tools](#tools)
      - [`ask_codebase`](#ask_codebase)
  - [⚙️ Development](#️-development)
    - [Prerequisites](#prerequisites)
    - [Steps](#steps)
  - [💻 Technology Stack](#-technology-stack)
  - [📜 License](#-license)
  - [📧 Contact](#-contact)

## 🚀 Usage

This project runs as an MCP server. It's typically invoked by an MCP client or controller.

### Connecting an MCP Client

Follow the configurations in these files, remember to update `env` inside with your preference:

- **[Visual Studio Code](https://code.visualstudio.com):** [.vscode/mcp.json](https://github.com/inkr-global/codebase-mcp/blob/main/.vscode/mcp.json)
- **[Claude](https://claude.ai):** [.mcp.json](https://github.com/inkr-global/codebase-mcp/blob/main/.mcp.json)
- **[Cursor](https://cursor.com):** [.cursor/mcp.json](https://github.com/inkr-global/codebase-mcp/blob/main/.mcp.json)
- **[Roo Code](https://github.com/RooVetGit/Roo-Code):** [.roo/mcp.json](https://github.com/inkr-global/codebase-mcp/blob/main/.mcp.json)

### Environment Variables

| Variable         | Description                            | Required | Default                     |
| ---------------- | -------------------------------------- | -------- | --------------------------- |
| `GEMINI_API_KEY` | Your Gemini API key                    | Yes      |                             |
| `MODEL`          | The model to use for codebase analysis | No       | `gemini-2.0-flash`          |
| `PROJECT_PATH`  | The path to the codebase               | No       | (current working directory) |

### Tools

Once connected, the client can invoke the tools provided by this server.

#### `ask_codebase`

| Argument   | Description                                                             | Required | Default               |
| ---------- | ----------------------------------------------------------------------- | -------- | --------------------- |
| `question` | The question to ask about the codebase                                  | Yes      |                       |
| `path`     | The path of the file or directory to query, relative to `PROJECT_PATH` | No       | (Use `PROJECT_PATH`) |

## ⚙️ Development

### Prerequisites

- [Bun](https://bun.sh/)
- Git

### Steps

1. **Install dependencies:**

   ```bash
   bun install
   ```

2. **Configuration (if necessary):**

   - Check if any specific environment variables are required for `@google/genai` (e.g., API keys). Create a `.env` file if needed. (Further investigation might be needed to confirm required variables).

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
