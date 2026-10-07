import * as vscode from 'vscode';
import { getHtml } from './html';
import { highlightRange, openFile } from '../services/editor';
import type { WebviewMessage } from '../types/test-api';
import { logStudy, isStudyEnabled } from '../services/study-log';
import { extension } from '../state';

/**
 * Webview provider for the LiquidJava extension
 * Provides an interactive user interface for the LiquidJava diagnostics 
 */
export class LiquidJavaWebviewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  public static readonly viewType = "liquidJavaView";
  private view?: vscode.WebviewView;
  private messageEmitter = new vscode.EventEmitter<any>();
  public readonly onDidReceiveMessage = this.messageEmitter.event;
  private webviewMessageEmitter = new vscode.EventEmitter<WebviewMessage>();
  public readonly onWebviewMessage = this.webviewMessageEmitter.event;

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this.view = webviewView;
    logStudy(webviewView.visible ? 'view_visible' : 'view_hidden');
    webviewView.onDidChangeVisibility(() => logStudy(webviewView.visible ? 'view_visible' : 'view_hidden'));
    webviewView.onDidDispose(() => logStudy('view_hidden'));
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };
    webviewView.webview.html = this.getHtml(webviewView.webview);

    // listen for messages coming from webview
    webviewView.webview.onDidReceiveMessage(message => {
      // emit the message to any external listeners
      this.webviewMessageEmitter.fire({ direction: "fromWebview", message });
      this.messageEmitter.fire(message);
      
      // handle message
      if (message.type === "openFile") {
        logStudy('diagnostic_reveal', { file: message.filePath, line: message.line + 1, column: message.character + 1 });
        if (message.highlightRange) logStudy('highlight', { file: message.filePath, line: message.highlightRange.lineStart + 1 });
        openFile(message.filePath, message.line, message.character, message.highlightRange);
      } else if (message.type === "highlight") {
        logStudy('highlight', { file: extension.file, line: message.range ? message.range.lineStart + 1 : null, active: Boolean(message.range) });
        // highlight the specified range in the current editor
        highlightRange(vscode.window.activeTextEditor, message.range);
      } else if (message.type === 'log' && isStudyEnabled()) {
        // accept only metadata; never persist arbitrary webview payloads
        if (message.event === 'tab_selected' && ['diagnostics', 'context', 'fsm'].includes(message.tab)) {
          logStudy('tab_selected', { tab: message.tab, file: extension.file });
        } else if (message.event === 'section_toggled' && typeof message.section === 'string' &&
          ['context-vars', 'context-ghosts', 'context-aliases', 'vc-changes', 'vc-implications'].includes(message.section)) {
          logStudy('section_toggled', { section: message.section, expanded: Boolean(message.expanded), file: extension.file });
        } else if (message.event === 'clipboard_copy' && ['diagnostic', 'fsm'].includes(message.target)) {
          logStudy('clipboard_copy', { target: message.target, file: extension.file });
        } else if (message.event === 'vc_step_selected' && ['previous', 'next'].includes(message.direction)) {
          logStudy('vc_step_selected', { direction: message.direction, file: extension.file });
        } else if (message.event === 'section_shown' && ['counterexample', 'vc-implications', 'hint'].includes(message.section)) {
          logStudy('section_shown', { section: message.section, file: extension.file });
        }
      }
    });
  }

  /**
   * Sends a message from the client to the webview
   * @param message
   */
  public sendMessage(message: any) {
    if (!this.view) return;
    this.webviewMessageEmitter.fire({ direction: "toWebview", message });
    this.view.webview.postMessage(message);
  }

  public dispose() {
    this.messageEmitter.dispose();
    this.webviewMessageEmitter.dispose();
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
