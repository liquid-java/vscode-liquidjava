# LiquidJava VS Code Extension

The **LiquidJava VS Code extension** adds support for **refinement types**, extending the Java standard type system directly inside VS Code, using the [LiquidJava](https://github.com/liquid-java/liquidjava) verifier. It provides error diagnostics and syntax highlighting for refinements.

## Getting Started

### GitHub Codespaces

To try out the extension on an example project without setting up your local environment:
1. Log in to GitHub
2. Click the button below
3. Select the `4-core` option
4. Press `Create codespace`

The codespace will open in your browser and automatically install the LiquidJava extension shortly.

   [![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/liquid-java/liquidjava-examples)

### Local Setup

To set up the extension locally, install the LiquidJava extension in the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=AlcidesFonseca.liquid-java) or the [Open VSX Marketplace](https://open-vsx.org/extension/AlcidesFonseca/liquid-java) and add the `liquidjava-api` dependency to your Java project.

#### Maven
```xml
<dependency>
    <groupId>io.github.liquid-java</groupId>
    <artifactId>liquidjava-api</artifactId>
    <version>0.0.4</version>
</dependency>
```

#### Gradle
```groovy
repositories {
    mavenCentral()
}

dependencies {
    implementation 'io.github.liquid-java:liquidjava-api:0.0.4'
}
```

## Development

### Developer Mode

To run the extension in developer mode, which automatically spawns the server in a separate process:

1. Open the `client` folder in VS Code
2. Run `npm install`
3. Make sure you have the Red Hat extension for [Language Support for Java™](https://github.com/redhat-developer/vscode-java) installed and enabled
4. Go to `Run` > `Run Extension` (or press `F5`)
5. A new VS Code instance will start with the LiquidJava extension enabled
6. Open a Java project containing the `liquid-java-api.jar` in the `lib` folder

### Debugging Mode

To run the extension in debugging mode by manually starting the server and connecting the client to it:

* Run the server:
    - Open the `server` folder in your IDE
    - Run `App.java`, which will start the server on port `50000`
    - View the server logs in the console

* Run the client:
    - Open the `client` folder in VS Code
    - Set the `DEBUG` variable to `true` in [`client/src/extension.ts`](./client/src/extension.ts)
    - Go to `Run` > `Run Extension` (or press `F5`)
    - A new VS Code instance will open with the LiquidJava extension enabled, which will connect to the server on port `50000`
    - Open a Java project containing the `liquid-java-api.jar` in the `lib` folder
    - View the client logs in the `LiquidJava` output channel or by clicking the status indicator

### Create Server JAR

To build the language server, export it as a runnable JAR file named `language-server-liquidjava.jar` and place it in `/client/server`.

- In **Eclipse**:
    - Open the `server` folder
    - Select `File > Export > Runnable JAR file`
    - In the launch configuration, choose `main - vscode-liquid-java-server`
    - In the output path, choose the `/client/server` folder of this extension
- In **VS Code**:
    - Open the `server` folder
    - Use the Export Jar feature (`Ctrl+Shift+P` > `Java: Export Jar`)
    - Select `App` as the main class
    - Select `OK`
    - Copy the generated JAR from the root directory to the `/client/server` folder
- In **IntelliJ**:
    - Open the `server` folder
    - Go to `File` > `Project Structure` > `Artifacts`
    - Select `Add a new Jar` > `From modules with dependencies`
    - Select `App` as the main class
    - Build the artifact via `Build` > `Build Artifacts` > `Build`
    - Copy the generated JAR from the `out/artifacts` folder to the `/client/server` folder

### Project Structure
- `/server` - Implements the [Language Server Protocol (LSP)](https://microsoft.github.io/language-server-protocol/) in Java using the [LSP4J](https://github.com/eclipse/lsp4j) library
- `/client` - Implements the VS Code extension in TypeScript that connects to the language server using LSP
    - It depends on [Language Support for Java™](https://github.com/redhat-developer/vscode-java) for regular Java errors
- `/lib` - Contains the `liquidjava-api.jar` required for the extension to be activated in a Java project
