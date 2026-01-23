import * as vscode from 'vscode';
import { extension } from '../state';

/**
 * Initializes hover provider for LiquidJava diagnostics
 */
export function registerHover() {
    vscode.languages.registerHoverProvider('java', {
        provideHover(document, position) {
            // if webview is visible, do not show hover
            if (extension.webview?.isVisible()) return null;
            
            // get lj diagnostic at the current position
            const diagnostics = vscode.languages.getDiagnostics(document.uri);
            const diagnostic = diagnostics.find(d => d.range.contains(position) && d.source === 'liquidjava');
            if (!diagnostic) return null;

            // create hover content with link to open webview
            const hoverContent = new vscode.MarkdownString();
            hoverContent.isTrusted = true;
            hoverContent.appendMarkdown(`\n\n[Open LiquidJava view](command:liquidjava.showView) for more details.`);
            return new vscode.Hover(hoverContent);
        }
    });
}
