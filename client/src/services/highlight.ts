import * as vscode from 'vscode'
import { Range } from '../types/context';

const highlight = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(255, 255, 0, 0.3)'
})

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