import * as vscode from 'vscode';
import { getHtml } from './html';
import { highlightRange, openFile } from '../services/editor';

/**
 * Webview provider for the LiquidJava extension
 * Provides an interactive user interface for the LiquidJava diagnostics 
 */
export class LiquidJavaWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "liquidJavaView";
  public static readonly panelType = "liquidJavaPanel";
  private view?: vscode.WebviewView;
  private panel?: vscode.WebviewPanel;
  private messageEmitter = new vscode.EventEmitter<any>();
  public readonly onDidReceiveMessage = this.messageEmitter.event;

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this.view = webviewView;
    this.initializeWebview(webviewView.webview);
  }

  /**
   * Sends a message from the client to the webview
   * @param message
   */
  public sendMessage(message: any) {
    this.view?.webview.postMessage(message);
    this.panel?.webview.postMessage(message);
  }

  /**
   * Checks if the webview is currently visible
   * @returns true if the webview is visible, false otherwise
   */
  public isVisible(): boolean {
    return (this.view?.visible ?? false) || (this.panel?.visible ?? false);
  }

  public showPanel() {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside);
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      LiquidJavaWebviewProvider.panelType,
      "LiquidJava",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [this.extensionUri]
      }
    );

    this.initializeWebview(this.panel.webview);
    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
  }

  /**
   * Generates the HTML content for the webview
   * @param webview
   * @returns HTML string
   */
  private getHtml(webview: vscode.Webview): string {
    return getHtml(webview, this.extensionUri);
  }

  private initializeWebview(webview: vscode.Webview) {
    webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };
    webview.html = this.getHtml(webview);

    // listen for messages coming from webview
    webview.onDidReceiveMessage(message => {
      // emit the message to any external listeners
      this.messageEmitter.fire(message);

      // handle message
      if (message.type === "openFile") {
        openFile(message.filePath, message.line, message.character, message.highlightRange);
      } else if (message.type === "highlight") {
        // highlight the specified range in the current editor
        highlightRange(vscode.window.activeTextEditor, message.range);
      }
    });
  }
}
