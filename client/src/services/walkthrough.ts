import * as vscode from 'vscode';

export const WALKTHROUGH_ID = 'AlcidesFonseca.liquid-java#getStarted';

export async function showWalkthrough(): Promise<void> {
    await vscode.commands.executeCommand('workbench.action.openWalkthrough', WALKTHROUGH_ID);
}

export async function copyWalkthroughDependency(context: Pick<vscode.ExtensionContext, 'extensionUri'>, language: 'xml' | 'groovy'): Promise<void> {
    const uri = vscode.Uri.joinPath(context.extensionUri, 'media/walkthrough/annotations.md');
    const contents = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8').replace(/\r\n/g, '\n');
    const snippet = contents.match(new RegExp('```' + language + '\\n([\\s\\S]*?)\\n```'))?.[1];
    if (!snippet) throw new Error('LiquidJava walkthrough dependency snippet is missing');
    await vscode.env.clipboard.writeText(snippet);
    vscode.window.setStatusBarMessage('LiquidJava: ' + (language === 'xml' ? 'Maven' : 'Gradle') + ' dependency copied', 3000);
}
