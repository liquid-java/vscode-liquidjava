import * as vscode from "vscode";
import { extension } from "../state";
import { LJStateMachine } from "../types/fsm";

/**
 * Requests the state machine for the given document from the language server
 * @param document The text document
 */
export async function updateStateMachine(document: vscode.TextDocument) {
    const sm = await extension.client?.sendRequest<LJStateMachine>("liquidjava/fsm", { uri: document.uri.toString() });

    // dont update diagram if it hasnt changed to a new one
    if (!sm || JSON.stringify(sm) === JSON.stringify(extension.stateMachine)) return;
    extension.stateMachine = sm;
    extension.webview?.sendMessage({ type: "fsm", sm });
}
