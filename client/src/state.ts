import * as child_process from "child_process";
import * as net from "net";
import { LanguageClient } from "vscode-languageclient/node";

export type ExtensionState = {
    serverProcess?: child_process.ChildProcess;
    client?: LanguageClient;
    socket?: net.Socket;
};

export const extension: ExtensionState = {};
