import * as vscode from "vscode";
import { extension } from "../state";
import { StateMachine } from "../types/fsm";

/**
 * Requests the state machine for the given document from the language server
 * @param document The text document
 */
export async function updateStateMachine(document: vscode.TextDocument) {
    const sm: StateMachine = await extension.client?.sendRequest("liquidjava/fsm", { uri: document.uri.toString() });
    extension.webview?.sendMessage({ type: "fsm", sm });
    extension.stateMachine = sm;
}
