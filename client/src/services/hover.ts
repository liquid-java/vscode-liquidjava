import * as vscode from 'vscode';
import { extension } from '../state';
import type { LJMethod, LJVariable } from '../types/context';
import { getSelectionContextVariables } from './context';
import { getOriginalVariableName, normalizeFilePath } from '../utils/utils';
import { definitionMatchesClass, getDefinitions } from './definition';
import { isExtensionRunning } from '../extension';
import type { SourcePosition } from '../types/diagnostics';
import { formatHintsMarkdown } from '../utils/message-markdown';

/**
 * Initializes hover provider for LiquidJava diagnostics
 */
export function registerHover() {
    vscode.languages.registerHoverProvider('java', {
        async provideHover(document, position) {
            if (!isExtensionRunning()) return null;

            const hoverContent = new vscode.MarkdownString();
            hoverContent.isTrusted = true;

            const variable = getHoveredVariable(document, position);
            if (variable && variable.mainRefinement && variable.mainRefinement !== 'true')
                hoverContent.appendCodeblock(formatRefinement(variable.mainRefinement), 'java');
            else {
                const method = await getHoveredMethod(document, position);
                if (method) {
                    hoverContent.appendCodeblock(formatMethodHover(method), 'java');
                    const link = formatMethodLocationLink(method);
                    if (link) hoverContent.appendMarkdown(`\n\n${link}`);
                }
            }

            const contents = [hoverContent, ...getHoveredHints(document, position)].filter(content => content.value.length > 0);
            if (contents.length === 0) return null;
            return new vscode.Hover(contents);
        }
    });
}

/**
 * The hints of the LiquidJava diagnostics at a position, in markdown. VS Code shows their message in its own hover,
 * which is plain text, and that hover leaves the hints out
 */
function getHoveredHints(document: vscode.TextDocument, position: vscode.Position): vscode.MarkdownString[] {
    const file = normalizeFilePath(document.uri.fsPath);
    return (extension.diagnostics ?? [])
        .filter(diagnostic => diagnostic.position && diagnostic.file && normalizeFilePath(diagnostic.file) === file)
        .filter(diagnostic => {
            const { lineStart, colStart, lineEnd, colEnd } = diagnostic.position!;
            return new vscode.Range(lineStart, colStart, lineEnd, colEnd).contains(position);
        })
        .map(diagnostic => formatHintsMarkdown(diagnostic.hints, diagnostic.references, toLocationLink))
        .filter((markdown): markdown is string => markdown !== null)
        .map(markdown => new vscode.MarkdownString(markdown));
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
    return allVars.find(variable => getOriginalVariableName(variable.name) === hoveredWord) || null;
}

async function getHoveredMethod(document: vscode.TextDocument, position: vscode.Position): Promise<LJMethod | null> {
    if (!extension.context) return null;

    const wordRange = document.getWordRangeAtPosition(position, /[A-Za-z_][A-Za-z0-9_]*/);
    if (!wordRange) return null;

    const hoveredWord = document.getText(wordRange);
    const file = normalizeFilePath(document.uri.fsPath);
    const methods = extension.context.methods.filter(method => methodNameMatches(method, hoveredWord));

    const definitions = await getDefinitions(document, position);
    const resolvedMethod = methods.find(method => definitions.some(definition => definitionMatchesClass(definition, method.targetClass)));
    if (resolvedMethod) return resolvedMethod;

    const receiver = document.lineAt(wordRange.start.line).text
        .slice(0, wordRange.start.character)
        .match(/([A-Za-z_][A-Za-z0-9_]*)\s*\.\s*$/)?.[1];
    if (!receiver) return null;
    const receiverVariable = [...(extension.context?.globalVars || []), ...(extension.context?.localVars || [])]
        .find(variable =>
            getOriginalVariableName(variable.name) === receiver &&
            (!variable.position || variable.position.file === file && isBefore(variable.position, wordRange.start))
        );
    if (!receiverVariable) return null;

    return methods.find(method => typeMatchesTargetClass(receiverVariable.type, method.targetClass)) || null;
}

function methodNameMatches(method: LJMethod, hoveredWord: string): boolean {
    return method.name === hoveredWord || method.name.endsWith(`.${hoveredWord}`);
}

function typeMatchesTargetClass(type: string, targetClass: string): boolean {
    return type === targetClass || targetClass.endsWith(`.${type}`) || type.endsWith(`.${targetClass}`);
}

function isBefore(range: { lineStart: number; colStart: number }, position: vscode.Position): boolean {
    return range.lineStart < position.line || range.lineStart === position.line && range.colStart < position.character;
}

function formatRefinement(refinement: string): string {
    return `@Refinement("${refinement}")`;
}

function formatStateRefinement(from: string | null, to: string | null): string {
    return `@StateRefinement(${[formatArgument('from', from), formatArgument('to', to)].filter(Boolean).join(', ')})`;
}

function formatArgument(name: string, value: string | null): string | null {
    return value && value !== 'true' ? `${name}="${value}"` : null;
}

function formatMethodHover(method: LJMethod): string {
    return [
        method.returnRefinement && method.returnRefinement !== 'true' && formatRefinement(method.returnRefinement),
        ...method.parameters
            .filter(p => p.mainRefinement && p.mainRefinement !== 'true')
            .map(p => `${formatRefinement(p.mainRefinement)} ${p.type} ${p.name}`),
        ...method.stateRefinements
            .filter(s => s.from || s.to)
            .map(s => formatStateRefinement(s.from, s.to))
    ].filter(Boolean).join('\n');
}

function formatMethodLocationLink(method: LJMethod): string | null {
    const link = method.position && toLocationLink(method.position);
    return link ? `[Go to Refinements Definition](${link})` : null;
}

// a link that opens the file at the position
function toLocationLink(position: SourcePosition): string | null {
    if (!position.file) return null;
    return vscode.Uri.file(position.file).with({ fragment: `L${position.lineStart + 1},${position.colStart + 1}` }).toString();
}
