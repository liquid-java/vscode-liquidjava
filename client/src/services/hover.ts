import * as vscode from 'vscode';
import { extension } from '../state';
import type { LJMethod, LJVariable } from '../types/context';
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
                hoverContent.appendCodeblock(formatVariableHover(variable), 'java');
            else {
                const method = getHoveredMethod(document, position);
                if (method) hoverContent.appendCodeblock(formatMethodHover(method), 'java');
            }

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

    // we need to use single point cursor position after variable to get all variables until that point
    const positionAfterVariable = {
        lineStart: wordRange.end.line,
        colStart: wordRange.end.character,
        lineEnd: wordRange.end.line,
        colEnd: wordRange.end.character
    };
    const { allVars } = getSelectionContextVariables(file, positionAfterVariable);
    return allVars.find(variable => getOriginalVariableName(variable.name) === hoveredWord);
}

function getHoveredMethod(document: vscode.TextDocument, position: vscode.Position): LJMethod | null {
    if (!extension.context) return null;

    const wordRange = document.getWordRangeAtPosition(position, /[A-Za-z_][A-Za-z0-9_]*/);
    if (!wordRange) return null;

    const hoveredWord = document.getText(wordRange);
    const file = normalizeFilePath(document.uri.fsPath);
    return extension.context.methods.find(method => method.name === hoveredWord && (!method.position?.file || method.position.file === file))
        || extension.context.methods.find(method => method.name === hoveredWord)
        || null;
}

function formatVariableHover(variable: LJVariable): string {
    return `@Refinement("${variable.mainRefinement}")`;
}

function formatMethodHover(method: LJMethod): string {
    return [
        method.signature,
        method.returnRefinement && method.returnRefinement !== 'true' && `@Refinement("${method.returnRefinement}")`,
        ...method.parameters
            .filter(p => p.mainRefinement && p.mainRefinement !== 'true')
            .map(p => `${p.type} ${p.name} @Refinement("${p.mainRefinement}")`),
        ...method.stateRefinements
            .filter(s => s.from || s.to)
            .map(s => `@StateRefinement("${s.from ? `from=${s.from}, ` : ""}` +`${s.to ? `to=${s.to}` : ""}`)
    ].filter(Boolean).join('\n');
}
