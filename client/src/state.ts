import * as child_process from "child_process";
import * as net from "net";
import * as vscode from "vscode";
import { LanguageClient } from "vscode-languageclient/node";

export type ExtensionStatus = "loading" | "stopped" | "passed" | "failed" | "crashed";

export type ExtensionState = {
    serverProcess?: child_process.ChildProcess;
    client?: LanguageClient;
    socket?: net.Socket;
    statusBar?: vscode.StatusBarItem;
    status?: ExtensionStatus;
};

export const extension: ExtensionState = {};
