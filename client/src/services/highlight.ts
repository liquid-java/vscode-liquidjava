import * as vscode from 'vscode'
import { Selection } from '../types/context'

const highlight = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(255, 255, 0, 0.3)'
})

export function highlightRange(editor: vscode.TextEditor, selection: Selection) {
    if (!selection) {
        editor.setDecorations(highlight, []);
        return;
    }
    const range = new vscode.Range(
        new vscode.Position(selection.startLine, selection.startColumn),
        new vscode.Position(selection.endLine, selection.endColumn)
    )
    editor.setDecorations(highlight, [{ range }])
    editor.revealRange(range, vscode.TextEditorRevealType.InCenter)
}