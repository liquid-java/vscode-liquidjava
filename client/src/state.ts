import * as vscode from "vscode";
import * as net from "net";
import * as child_process from "child_process";
import { LanguageClient } from "vscode-languageclient/node";
import { LiquidJavaLogger } from "./services/logger";
import { LiquidJavaWebviewProvider } from "./webview/provider";
import { LJDiagnostic } from "./types";
import { StateMachine } from "./types/fsm";

export class ExtensionState {
    // server/client state
    serverProcess?: child_process.ChildProcess;
    client?: LanguageClient;
    socket?: net.Socket;
    
    // ui state
    outputChannel?: vscode.OutputChannel;
    logger?: LiquidJavaLogger;
    statusBar?: vscode.StatusBarItem;
    webview?: LiquidJavaWebviewProvider;
    
    // application state
    file?: string;
    diagnostics?: LJDiagnostic[];
    stateMachine?: StateMachine;
}

export const extension = new ExtensionState();