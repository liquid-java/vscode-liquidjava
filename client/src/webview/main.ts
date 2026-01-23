import { getScript } from "./script";

// webview entry point

declare function acquireVsCodeApi(): any;
declare const document: any;
declare const window: any;

const vscode = acquireVsCodeApi();
getScript(vscode, document, window);
