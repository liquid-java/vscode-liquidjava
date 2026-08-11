import * as vscode from "vscode";
import * as net from "net";
import * as child_process from "child_process";
import { LanguageClient } from "vscode-languageclient/node";
import { LiquidJavaLogger } from "./services/logger";
import { LiquidJavaWebviewProvider } from "./webview/provider";
import type { LJDiagnostic, RefinementMismatchError } from "./types/diagnostics";
import type { LJStateMachine } from "./types/fsm";
import { LJContext, Range } from "./types/context";

export type ExtensionStatus = "loading" | "stopped" | "passed" | "failed" | "crashed";

export class ExtensionState {
    // server/client state
    serverProcess?: child_process.ChildProcess;
    client?: LanguageClient;
    socket?: net.Socket;
    
    // ui state
    logger?: LiquidJavaLogger;
    statusBar?: vscode.StatusBarItem;
    webview?: LiquidJavaWebviewProvider;
    status?: ExtensionStatus;
    
    // application state
    file?: string;
    diagnostics?: LJDiagnostic[];
    stateMachine?: LJStateMachine | null;
    context?: LJContext;
    currentSelection?: Range;
    errorAtCursor?: RefinementMismatchError;
}

export const extension = new ExtensionState();
