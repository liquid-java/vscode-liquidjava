import * as vscode from "vscode";
import { extension } from "../state";
import { LJStateMachine } from "../types/fsm";
import { normalizeFilePath } from "../utils/utils";

/**
 * Requests the state machines for the given document from the language server, one per state set
 * @param document The text document
 */
export async function updateStateMachine(document: vscode.TextDocument) {
    const file = normalizeFilePath(document.uri.fsPath);
    const sms = await extension.client?.sendRequest<LJStateMachine[] | null>("liquidjava/fsm", { uri: document.uri.toString() });
    if (file !== extension.file) return;

    extension.stateMachines = sms;
    extension.webview?.sendMessage({ type: "fsm", sms });
}
