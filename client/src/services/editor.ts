import * as vscode from 'vscode'
import { Range } from '../types/context';

const highlight = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(255, 255, 0, 0.3)'
})

export async function openFile(filePath: string, line: number, character: number, rangeToHighlight?: Range) {
    const uri = vscode.Uri.file(filePath);
    const doc = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(doc);
    const position = new vscode.Position(line, character);
    const range = new vscode.Range(position, position);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    if (rangeToHighlight) highlightRange(editor, rangeToHighlight);
}

export function highlightRange(editor: vscode.TextEditor, range: Range) {
    if (!range) {
        editor.setDecorations(highlight, []);
        return;
    }
    const nativeRange = new vscode.Range(
        new vscode.Position(range.lineStart, range.colStart),
        new vscode.Position(range.lineEnd, range.colEnd)
    )
    editor.setDecorations(highlight, [{ range: nativeRange }])
    editor.revealRange(nativeRange, vscode.TextEditorRevealType.InCenter)
}