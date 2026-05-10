import * as vscode from 'vscode';
import type { SourcePosition } from '../types/diagnostics';
import { normalizeFilePath } from '../utils/utils';

type Definition = {
    uri: vscode.Uri;
    range: vscode.Range;
}

export async function getDefinitions(document: vscode.TextDocument, position: vscode.Position): Promise<Definition[]> {
    try {
        const definitions = await vscode.commands.executeCommand<(vscode.Location | vscode.LocationLink)[]>(
            'vscode.executeDefinitionProvider',
            document.uri,
            position
        ) || [];
        return definitions.map(definition => definition instanceof vscode.Location
            ? { uri: definition.uri, range: definition.range }
            : { uri: definition.targetUri, range: definition.targetSelectionRange || definition.targetRange }
        );
    } catch {
        return [];
    }
}

export function sourcePositionContains(position: SourcePosition, range: vscode.Range): boolean {
    return toVSCodeRange(position).contains(range);
}

export function definitionMatchesPosition(definition: Definition, position: SourcePosition | null): boolean {
    return !!position?.file &&
        normalizeFilePath(definition.uri.fsPath) === position.file &&
        rangesOverlap(definition.range, toVSCodeRange(position));
}

export function definitionMatchesClass(definition: Definition, targetClass: string): boolean {
    const uri = definition.uri.toString();
    return !!targetClass && (uri.includes(targetClass) || uri.includes(targetClass.replace(/\./g, '/')));
}

function rangesOverlap(left: vscode.Range, right: vscode.Range): boolean {
    return left.contains(right.start) || left.contains(right.end) || right.contains(left.start) || right.contains(left.end);
}

function toVSCodeRange(range: SourcePosition): vscode.Range {
    return new vscode.Range(range.lineStart, range.colStart, range.lineEnd, range.colEnd);
}
