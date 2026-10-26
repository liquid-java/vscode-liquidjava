import * as vscode from "vscode";
import { extension } from "../state";
import type { LJDiagnostic } from "../types/diagnostics";
import { getDiagnosticRevealTarget } from "../webview/diagnostic-reveal";
import { normalizeFilePath } from "../utils/utils";
import { isExtensionRunning } from "../extension";

const codeLensEmitter = new vscode.EventEmitter<void>();

export function registerCodeLens(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider("java", {
            onDidChangeCodeLenses: codeLensEmitter.event,
            provideCodeLenses(document) {
                if (!isExtensionRunning()) return [];

                const file = normalizeFilePath(document.uri.fsPath);
                return (extension.diagnostics || [])
                    .flatMap(diagnostic => createDiagnosticCodeLenses(diagnostic, file));
            }
        })
    );
}

export function refreshCodeLenses() {
    codeLensEmitter.fire();
}

function createDiagnosticCodeLenses(diagnostic: LJDiagnostic, file: string): vscode.CodeLens[] {
    const targetDiagnostic = getDiagnosticRevealTarget(diagnostic);
    if (!targetDiagnostic || targetDiagnostic.file !== file) return [];

    const position = targetDiagnostic.position;
    const range = new vscode.Range(
        new vscode.Position(position.lineStart, position.colStart),
        new vscode.Position(position.lineStart, position.colStart)
    );
    const codeLenses = [new vscode.CodeLens(range, {
        title: diagnostic.title,
        command: "liquidjava.showView",
        arguments: [targetDiagnostic]
    })];
    if (diagnostic.type === 'state-refinement-error' && diagnostic.stateMachine) {
        codeLenses.push(new vscode.CodeLens(range, {
            title: "Show in state machine",
            command: "liquidjava.showView",
            arguments: [targetDiagnostic, 'fsm']
        }));
    }
    return codeLenses;
}
