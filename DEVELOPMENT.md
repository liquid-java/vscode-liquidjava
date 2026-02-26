# LiquidJava VS Code Extension Development Guide

### Prerequisites

Before starting development, ensure you have:

- Java 20 or higher installed and configured in your `PATH`
- Maven 3.6 or higher for building the language server
- Node.js and npm for building and packaging the client
- Visual Studio Code and the [Language Support for Java(TM) by Red Hat](https://marketplace.visualstudio.com/items?itemName=redhat.java) extension installed and enabled

### Cloning and Setup

To get started, clone the repository and install the client dependencies:

```bash
git clone https://github.com/liquid-java/vscode-liquidjava.git
cd vscode-liquidjava
cd client
npm install
```

### Packaging and Installation

To build the language server, package the extension, and install it in your local VS Code instance, you can run the provided script from the repository root:

```bash
./install.sh <version>
```

Replace `<version>` with the version number in [client/package.json](./client/package.json).

### Releasing

To create and push a git tag that will trigger the GitHub Actions workflow that automatically publishes the extension in both the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=AlcidesFonseca.liquid-java) and the [Open VSX Registry](https://open-vsx.org/extension/AlcidesFonseca/liquid-java):
1. Increment the version in [client/package.json](./client/package.json)
2. Run the release script from the repository root:

```bash
./release.sh <new-version>
```

### Development Mode

To run the extension in development mode, follow these steps:
1. Go to **Run** > **Run Extension** (or press **F5**)
2. A new VS Code instance will open with the extension installed, which will automatically run the language server in the background and connect to it
3. Open a Java project using LiquidJava

To run the language server manually, follow these steps:

1. Run the server in port `50000` (default)
2. In the client, set the `DEBUG` constant in [client/src/extension.ts](./client/src/extension.ts) to `true`
3. Run the client which will connect to the server in port `50000`

### Project Structure
- `/server` - Implements the language server in Java using [LSP4J](https://github.com/eclipse/lsp4j)
- `/client` - Implements the VS Code extension in TypeScript that connects to the language server via LSP
