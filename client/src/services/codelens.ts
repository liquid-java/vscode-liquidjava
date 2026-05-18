import * as vscode from "vscode";
import { extension } from "../state";
import type { LJDiagnostic } from "../types/diagnostics";
import { getDiagnosticRevealTarget } from "../webview/diagnostic-reveal";
import { normalizeFilePath } from "../utils/utils";

const codeLensEmitter = new vscode.EventEmitter<void>();

export function registerCodeLens(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider("java", {
            onDidChangeCodeLenses: codeLensEmitter.event,
            provideCodeLenses(document) {
                const file = normalizeFilePath(document.uri.fsPath);
                return (extension.diagnostics || [])
                    .map(diagnostic => createDiagnosticCodeLens(diagnostic, file))
                    .filter((codeLens): codeLens is vscode.CodeLens => Boolean(codeLens));
            }
        })
    );
}

export function refreshCodeLenses() {
    codeLensEmitter.fire();
}

function createDiagnosticCodeLens(diagnostic: LJDiagnostic, file: string): vscode.CodeLens | undefined {
    const targetDiagnostic = getDiagnosticRevealTarget(diagnostic);
    if (!targetDiagnostic || targetDiagnostic.file !== file) return undefined;

    const position = targetDiagnostic.position;
    const range = new vscode.Range(
        new vscode.Position(position.lineStart, position.colStart),
        new vscode.Position(position.lineStart, position.colStart)
    );
    return new vscode.CodeLens(range, {
        title: diagnostic.title,
        command: "liquidjava.showView",
        arguments: [targetDiagnostic]
    });
}
