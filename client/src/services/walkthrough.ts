import * as vscode from 'vscode';

export const WALKTHROUGH_ID = 'AlcidesFonseca.liquid-java#getStarted';

export async function showWalkthrough(): Promise<void> {
    await vscode.commands.executeCommand('workbench.action.openWalkthrough', WALKTHROUGH_ID);
}
