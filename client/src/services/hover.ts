import * as vscode from 'vscode';
import { extension } from '../state';
import type { Range, LJVariable } from '../types/context';
import { getSelectionContextVariables } from './context';
import { getOriginalVariableName, normalizeFilePath } from '../utils/utils';

/**
 * Initializes hover provider for LiquidJava diagnostics
 */
export function registerHover() {
    vscode.languages.registerHoverProvider('java', {
        provideHover(document, position) {
            const hoverContent = new vscode.MarkdownString();
            hoverContent.isTrusted = true;

            const variable = getHoveredVariable(document, position);
            if (variable && variable.mainRefinement && variable.mainRefinement !== 'true')
                hoverContent.appendCodeblock(`@Refinement(${JSON.stringify(variable.mainRefinement)})`, 'java');

            const diagnostics = vscode.languages.getDiagnostics(document.uri);
            const containsDiagnostic = !!diagnostics.find(d => d.range.contains(position) && d.source === 'liquidjava');
            if (containsDiagnostic) {
                if (hoverContent.value.length > 0) hoverContent.appendMarkdown(`\n\n`);
                hoverContent.appendMarkdown(`[Open LiquidJava view](command:liquidjava.showView) for more details.`);
            }
            if (hoverContent.value.length === 0) return null;
            return new vscode.Hover(hoverContent);
        }
    });
}

function getHoveredVariable(document: vscode.TextDocument, position: vscode.Position): LJVariable | null {
    if (!extension.context) return null;

    const wordRange = document.getWordRangeAtPosition(position, /[#]?[A-Za-z_][A-Za-z0-9_#]*/);
    if (!wordRange) return null;

    const hoveredWord = document.getText(wordRange);
    const file = normalizeFilePath(document.uri.fsPath);
    const hoveredRange: Range = {
        lineStart: position.line + 1,
        colStart: position.character + 1,
        lineEnd: position.line + 1,
        colEnd: position.character + 1
    }
    const { allVars } = getSelectionContextVariables(file, hoveredRange);
    return allVars.find(variable => getOriginalVariableName(variable.name) === hoveredWord);
}
