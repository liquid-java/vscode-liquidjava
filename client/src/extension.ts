import * as vscode from "vscode";
import * as path from "path";
import * as net from "net";
import * as child_process from "child_process";
import { LanguageClient, LanguageClientOptions, ServerOptions, State } from "vscode-languageclient/node";
import { LiquidJavaLogger, createLogger } from "./logging";
import { applyItalicOverlay } from "./decorators";
import { connectToPort, findJavaExecutable, getAvailablePort, killProcess } from "./utils";
import { SERVER_JAR, DEBUG_MODE, DEBUG_PORT } from "./constants";
import { LiquidJavaWebviewProvider } from "./webview/provider";
import { LJDiagnostic } from "./types";
import { createMermaidDiagram } from "./webview/fsm";
import { StateMachine } from "./types/fsm";

let serverProcess: child_process.ChildProcess;
let client: LanguageClient;
let socket: net.Socket;
let outputChannel: vscode.OutputChannel;
let logger: LiquidJavaLogger;
let statusBarItem: vscode.StatusBarItem;
let currentDiagnostics: LJDiagnostic[];
let webviewProvider: LiquidJavaWebviewProvider;
let currentFile: string | undefined;
let currentStateMachine: StateMachine | undefined;

/**
 * Activates the LiquidJava extension
 * @param context The extension context
 */
export async function activate(context: vscode.ExtensionContext) {
    initLogging(context);
    initStatusBar(context);
    initCommandPalette(context);
    initWebview(context);
    initFileEvents(context);
    initHover();

    logger.client.info("Activating LiquidJava extension...");
    
    await applyItalicOverlay();

    // find java executable path
    const javaExecutablePath = findJavaExecutable();
    if (!javaExecutablePath) {
        vscode.window.showErrorMessage("LiquidJava - Java Runtime Not Found in JAVA_HOME or PATH");
        logger.client.error("Java Runtime not found in JAVA_HOME or PATH - Not activating extension");
        updateStatusBar("stopped");
        return;
    }
    logger.client.info("Using Java at: " + javaExecutablePath);

    // start server
    logger.client.info("Starting LiquidJava language server...");
    const port = await runLanguageServer(context, javaExecutablePath);

    // start client
    logger.client.info("Starting LiquidJava client...");
    await runClient(context, port);
}

/**
 * Deactivates the LiquidJava extension
 */
export async function deactivate() {
    logger?.client.info("Deactivating LiquidJava extension...");
    await stopExtension("Extension was deactivated");
}

/**
 * Initializes logging for the extension with an output channel
 * @param context The extension context
 */
function initLogging(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel("LiquidJava");
    logger = createLogger(outputChannel);
    context.subscriptions.push(outputChannel);
    context.subscriptions.push(logger);
    context.subscriptions.push(vscode.commands.registerCommand("liquidjava.showLogs", () => outputChannel.show(true)));
}

/**
 * Initializes the status bar for the extension
 * @param context The extension context
 */
function initStatusBar(context: vscode.ExtensionContext) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    statusBarItem.tooltip = "LiquidJava Commands";
    statusBarItem.command = "liquidjava.showCommands";
    updateStatusBar("loading")
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
}

/**
 * Initializes the command palette for the extension
 * @param context The extension context
 */
function initCommandPalette(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand("liquidjava.showCommands", async () => {
            const commands = [
                { label: "$(output) Show Logs", command: "liquidjava.showLogs" },
                { label: "$(window) Show View", command: "liquidjava.showView" },
                // TODO: add more commands here, e.g., start, stop, restart, verify, etc.
            ];
            const placeHolder = "Select a LiquidJava Command";
            const selected = await vscode.window.showQuickPick(commands, { placeHolder });
            if (selected) vscode.commands.executeCommand(selected.command);
        })
    );
}

/**
 * Initializes the webview panel for the extension
 * @param context The extension context
 */
function initWebview(context: vscode.ExtensionContext) {
    webviewProvider = new LiquidJavaWebviewProvider(context.extensionUri);

    // webview provider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(LiquidJavaWebviewProvider.viewType, webviewProvider)
    );
    // show view command
    context.subscriptions.push(
        vscode.commands.registerCommand("liquidjava.showView", () => {
            vscode.commands.executeCommand("liquidJavaView.focus");
        })
    );
    // listen for messages from the webview
    context.subscriptions.push(
        webviewProvider.onDidReceiveMessage(message => {
            console.log("received message", message);
            if (message.type === "ready") {
                webviewProvider.sendMessage({ type: "file", file: currentFile });
                webviewProvider.sendMessage({ type: "diagnostics", diagnostics: currentDiagnostics });
                if (currentStateMachine) webviewProvider.sendMessage({ type: "fsm", sm: currentStateMachine });
            }
        })
    );
}

/**
 * Initializes hover provider for LiquidJava diagnostics
 */
function initHover() {
    vscode.languages.registerHoverProvider('java', {
        provideHover(document, position) {
            // if webview is visible, do not show hover
            if (webviewProvider?.isVisible()) return null;
            
            // get lj diagnostic at the current position
            const diagnostics = vscode.languages.getDiagnostics(document.uri);
            const diagnostic = diagnostics.find(d => d.range.contains(position) && d.source === 'liquidjava');
            if (!diagnostic) return null;

            // create hover content with link to open webview
            const hoverContent = new vscode.MarkdownString();
            hoverContent.isTrusted = true;
            hoverContent.appendMarkdown(`\n\n[Open LiquidJava view](command:liquidjava.showView) for more details.`);
            return new vscode.Hover(hoverContent);
        }
    });
}


/**
 * Initializes file system event listeners
 * @param context The extension context
 */
function initFileEvents(context: vscode.ExtensionContext) {
    // listen for active text editor changes
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (!editor || editor.document.languageId !== "java") return;
            handleActiveFileChange(editor);
            
        }),
        vscode.workspace.onDidSaveTextDocument(document => {
            if (document.uri.scheme !== 'file' || document.languageId !== "java") return;
            requestStateMachine(document)
        })
    );
}

/**
 * Requests the state machine for the given document from the language server
 * @param document The text document
 */
async function requestStateMachine(document: vscode.TextDocument) {
    const sm: StateMachine = await client?.sendRequest("liquidjava/fsm", { uri: document.uri.toString() });
    webviewProvider?.sendMessage({ type: "fsm", sm });
    currentStateMachine = sm;
}

/**
 * Updates the status bar with the current state
 * @param state The current state ("loading", "stopped", "passed", "failed")
 */
function updateStatusBar(state: "loading" | "stopped" | "passed" | "failed") {
    const icons = {
        loading: "$(sync~spin)",
        stopped: "$(circle-slash)",
        passed: "$(check)",
        failed: "$(x)",
    };
    const color = state === "stopped" ? "errorForeground" : "statusBar.foreground";
    statusBarItem.color = new vscode.ThemeColor(color);
    statusBarItem.text = icons[state] + " LiquidJava";
}

/**
 * Runs the LiquidJava language server
 * @param context The extension context
 * @param javaExecutablePath The path to the Java executable
 * @returns A promise to the port number the server is running on
 */
async function runLanguageServer(context: vscode.ExtensionContext, javaExecutablePath: string): Promise<number> {
    const port = DEBUG_MODE ? DEBUG_PORT : await getAvailablePort();
    if (DEBUG_MODE) {
        logger.client.info("DEBUG MODE: Using fixed port " + port);
        return port;
    }
    logger.client.info("Running language server on port " + port);

    const jarPath = path.resolve(context.extensionPath, "dist", "server", SERVER_JAR);
    const args = ["-jar", jarPath, port.toString()];
    const options = {
        cwd: vscode.workspace.workspaceFolders[0].uri.fsPath, // root path
    };
    logger.client.info("Creating language server process...");
    serverProcess = child_process.spawn(javaExecutablePath, args, options);

    // listen to process events
    serverProcess.stdout.on("data", (data) => {
        const message = data.toString().trim();
        logger.server.info(message);
    });
    serverProcess.stderr.on("data", (data) => {
        logger.server.error(data.toString().trim())
    });
    serverProcess.on("error", (err) => {
        logger.server.error(`Failed to start: ${err}`)
    });
    serverProcess.on("close", (code) => {
        logger.server.info(`Process exited with code ${code}`);
        client?.stop();
    });
    return port;
}

/**
 * Starts the client and connects it to the language server
 * @param context The extension context
 * @param port The port number the server is running on
 */
async function runClient(context: vscode.ExtensionContext, port: number) {
    const serverOptions: ServerOptions = () => {
        return new Promise(async (resolve, reject) => {
            try {
                socket = await connectToPort(port);
                resolve({
                    writer: socket,
                    reader: socket,
                });
            } catch (error) {
                await stopExtension("Failed to connect to server");
                reject(error);
            }
        });
    };
    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ language: "java" }],
    };
    client = new LanguageClient("liquidJavaServer", "LiquidJava Server", serverOptions, clientOptions);
    client.onDidChangeState((e) => {
        if (e.newState === State.Stopped) {
            stopExtension("Extension stopped");
        }
    });
    
    context.subscriptions.push(client); // client teardown
    context.subscriptions.push({
        dispose: () => stopExtension("Extension was disposed"), // server teardown
    });

    try {
        await client.start();
        logger.client.info("Extension is ready");
        
        client.onNotification("liquidjava/diagnostics", (diagnostics: LJDiagnostic[]) => {
            handleLJDiagnostics(diagnostics);
        });

        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === "java") {
            handleActiveFileChange(editor);
        }
    } catch (e) {
        vscode.window.showErrorMessage("LiquidJava failed to initialize: " + e.toString());
        logger.client.error("Failed to initialize: " + e.toString());
        await stopExtension("Failed to initialize");
    }

    // update status bar on file save
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(() => {
            if (client) {
                updateStatusBar("loading");
            }
        })
    );
}

/**
 * Stops the LiquidJava extension
 * @param reason The reason for stopping the extension
 */
async function stopExtension(reason: string) {
    if (!client && !serverProcess && !socket) {
        logger.client.info("Extension already stopped");
        return;
    }
    logger.client.info("Stopping LiquidJava extension: " + reason);
    updateStatusBar("stopped");

    // stop client
    try {
        await client?.stop();
    } catch (e) {
        logger.client.error("Error stopping client: " + e);
    } finally {
        client = undefined;
    }

    // close socket
    try {
        socket?.destroy();
    } catch (e) {
        logger.client.error("Error closing socket: " + e);
    } finally {
        socket = undefined;
    }

    // kill server process
    await killProcess(serverProcess);
    serverProcess = undefined;
}

/**
 * Handles LiquidJava diagnostics received from the language server
 * @param diagnostics The array of diagnostics received
 */
function handleLJDiagnostics(diagnostics: LJDiagnostic[]) {
    const containsError = diagnostics.some(d => d.category === "error");
    if (containsError) {
        updateStatusBar("failed");
    } else {
        updateStatusBar("passed");
    }
    webviewProvider?.sendMessage({ type: "diagnostics", diagnostics });
    currentDiagnostics = diagnostics;
}

/**
 * Handles active file change events
 * @param editor The active text editor
 */
function handleActiveFileChange(editor: vscode.TextEditor) {
    currentFile = editor.document.uri.fsPath;
    webviewProvider?.sendMessage({ type: "file", file: currentFile });
    requestStateMachine(editor.document);
}