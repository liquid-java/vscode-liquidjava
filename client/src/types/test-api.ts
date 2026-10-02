import type * as vscode from "vscode";
import type { ExtensionStatus } from "../state";
import type { LJDiagnostic } from "./diagnostics";

export interface WebviewMessage {
    direction: "toWebview" | "fromWebview";
    message: any;
}

export interface LiquidJavaTestApi {
    readonly ready: Promise<void>;
    readonly onDiagnostics: vscode.Event<LJDiagnostic[]>;
    getState(): { status: ExtensionStatus | undefined; diagnostics: LJDiagnostic[]; serverPid: number | undefined };
    readonly onWebviewMessage: vscode.Event<WebviewMessage>;
}
