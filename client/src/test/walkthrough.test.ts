import * as assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as vscode from 'vscode';
import { WALKTHROUGH_ID } from '../services/walkthrough';
import type { LiquidJavaTestApi } from '../types/test-api';

suite('LiquidJava walkthrough', () => {
    let installed: vscode.Extension<LiquidJavaTestApi>;

    suiteSetup(async () => {
        installed = vscode.extensions.getExtension<LiquidJavaTestApi>('AlcidesFonseca.liquid-java')!;
        assert.ok(installed);
        await installed.activate();
    });

    teardown(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    });

    test('contributes four steps with packaged content and registered actions', async () => {
        const walkthrough = installed.packageJSON.contributes.walkthroughs.find(
            (entry: { id: string }) => `${installed.id}#${entry.id}` === WALKTHROUGH_ID);
        assert.ok(walkthrough);
        assert.deepEqual(walkthrough.steps.map((step: { id: string }) => step.id),
            ['verification', 'diagnostics', 'context', 'stateMachine']);
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('liquidjava.showWalkthrough'));
        for (const step of walkthrough.steps) {
            const content = await readFile(vscode.Uri.joinPath(installed.extensionUri, step.media.markdown).fsPath, 'utf8');
            assert.ok(content.trim(), `${step.id} must have readable content`);
            const links = [...step.description.matchAll(/\]\(command:([^)?]+)\)/g)];
            assert.ok(links.length > 0, `${step.id} must have an action`);
            for (const link of links) assert.ok(commands.includes(link[1]), `unregistered action: ${link[1]}`);
        }
    });

    test('reopens the native walkthrough repeatedly after dismissal', async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        await vscode.commands.executeCommand('liquidjava.showWalkthrough');
        assert.ok(vscode.window.tabGroups.activeTabGroup.activeTab, 'the registered command must reopen the walkthrough');
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        await vscode.commands.executeCommand('liquidjava.showWalkthrough');
        assert.ok(vscode.window.tabGroups.activeTabGroup.activeTab, 'manual reopening must remain available');
    });
});
