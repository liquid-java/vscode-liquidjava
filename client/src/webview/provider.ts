import * as vscode from 'vscode';
import { getHtml } from './html';
import { highlightRange } from '../services/highlight';

/**
 * Webview provider for the LiquidJava extension
 * Provides an interactive user interface for the LiquidJava diagnostics 
 */
export class LiquidJavaWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "liquidJavaView";
  private view?: vscode.WebviewView;
  private messageEmitter = new vscode.EventEmitter<any>();
  public readonly onDidReceiveMessage = this.messageEmitter.event;

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };
    webviewView.webview.html = this.getHtml(webviewView.webview);

    // listen for messages coming from webview
    webviewView.webview.onDidReceiveMessage(message => {
      // emit the message to any external listeners
      this.messageEmitter.fire(message);
      
      // handle message
      if (message.type === "openFile") {
        // open file at the specified location
        const uri = vscode.Uri.file(message.filePath);
        vscode.workspace.openTextDocument(uri).then(doc => {
          vscode.window.showTextDocument(doc).then(editor => {
            const position = new vscode.Position(message.line, message.character);
            const range = new vscode.Range(position, position);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
          });
        });
      } else if (message.type === "highlight") {
        // highlight the specified range in the current editor
        highlightRange(vscode.window.activeTextEditor, message.selection);
      }
    });
  }

  /**
   * Sends a message from the client to the webview
   * @param message
   */
  public sendMessage(message: any) {
    this.view?.webview.postMessage(message);
  }

  /**
   * Checks if the webview is currently visible
   * @returns true if the webview is visible, false otherwise
   */
  public isVisible(): boolean {
    return this.view?.visible ?? false;
  }

  /**
   * Generates the HTML content for the webview
   * @param webview
   * @returns HTML string
   */
  private getHtml(webview: vscode.Webview): string {
    return getHtml(webview, this.extensionUri);
  }
}
