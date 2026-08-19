import * as vscode from "vscode";
import { getStyles } from "./styles";

const MERMAID_CDN = "https://cdn.jsdelivr.net/npm/mermaid@11.16.1/dist/mermaid.esm.min.mjs";
const MERMAID_ELK_CDN = "https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk@0.2.2/dist/mermaid-layout-elk.esm.min.mjs";

/**
 * Generates the HTML content for the webview
 * @param webview
 * @param extensionUri
 * @returns HTML string
 */
export function getHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const nonce = Date.now().toString();
    const cspSource = webview.cspSource;
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "webview.js"));
    const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "codicons", "codicon.css"));
    return /*html*/ `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta
                http-equiv="Content-Security-Policy"
                content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; font-src ${cspSource}; script-src 'nonce-${nonce}' https://cdn.jsdelivr.net; connect-src https://cdn.jsdelivr.net;"
            >
            <link href="${codiconsUri}" rel="stylesheet">
            <style>${getStyles()}</style>
        </head>
        <body>
            <div id="root"></div>
            <script nonce="${nonce}" type="module">
                import mermaid from '${MERMAID_CDN}';
                import elkLayouts from '${MERMAID_ELK_CDN}';
                mermaid.registerLayoutLoaders(elkLayouts);
                mermaid.initialize({
                    startOnLoad: false,
                    layout: 'elk',
                    theme: document.body.classList.contains('vscode-light') ? 'default' : 'dark',
                    securityLevel: 'loose',
                    flowchart: {
                        useMaxWidth: true,
                        htmlLabels: true
                    }
                });
                window.mermaid = mermaid;
            </script>
            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>
    `;
}
