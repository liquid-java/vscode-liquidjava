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

    test('contributes the tour with readable content and usable actions', async () => {
        const walkthrough = installed.packageJSON.contributes.walkthroughs.find(
            (entry: { id: string }) => `${installed.id}#${entry.id}` === WALKTHROUGH_ID);
        assert.ok(walkthrough);
        assert.equal(walkthrough.title, 'Get Started with LiquidJava');
        assert.deepEqual(walkthrough.steps.map((step: { id: string }) => step.id),
            ['setup', 'annotations', 'verification', 'commands', 'diagnostics', 'context', 'stateMachine', 'logs', 'tutorial']);
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('liquidjava.showWalkthrough'));
        for (const step of walkthrough.steps) {
            const content = await readFile(vscode.Uri.joinPath(installed.extensionUri, step.media.markdown).fsPath, 'utf8');
            assert.ok(content.trim(), `${step.id} must have readable content`);
            const links = [...step.description.matchAll(/\]\(command:([^)?]+)\)/g)];
            for (const link of links) assert.ok(commands.includes(link[1]), `unregistered action: ${link[1]}`);
            assert.ok(!links.some(link => link[1] === 'liquidjava.verify'),
                'walkthrough actions must work without an active Java editor');
        }
        const description = (id: string) => walkthrough.steps.find((step: { id: string }) => step.id === id).description;
        assert.ok(description('commands').includes('(command:workbench.action.showCommands)'));
        assert.ok(description('logs').includes('(command:liquidjava.showLogs)'));
        assert.ok(description('tutorial').includes('(https://liquid-java.github.io/liquidjava-interactive-tutorial/)'));
    });

    test('uses the README dependency snippets for Maven and Gradle setup', async () => {
        const readme = await readFile(vscode.Uri.joinPath(installed.extensionUri, 'README.md').fsPath, 'utf8');
        const setup = await readFile(vscode.Uri.joinPath(installed.extensionUri, 'media/walkthrough/annotations.md').fsPath, 'utf8');
        for (const language of ['xml', 'groovy']) {
            const snippet = readme.match(new RegExp('```' + language + '\\n[\\s\\S]*?```'))?.[0];
            assert.ok(snippet, `README must include the ${language} dependency snippet`);
            assert.ok(setup.includes(snippet), `walkthrough ${language} dependency must match the README`);
        }
        assert.ok(setup.includes('liquidjava.specification.Refinement'));
    });

    test('reopens the native walkthrough repeatedly after dismissal', async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        await vscode.commands.executeCommand('liquidjava.showWalkthrough');
        assert.ok(vscode.window.tabGroups.activeTabGroup.activeTab, 'the registered command must reopen the walkthrough');
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        await vscode.commands.executeCommand('liquidjava.showWalkthrough');
        assert.ok(vscode.window.tabGroups.activeTabGroup.activeTab, 'manual reopening must remain available');
    });

    test('opens the logs from the walkthrough without an active Java editor', async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        await vscode.commands.executeCommand('liquidjava.showWalkthrough');
        assert.equal(vscode.window.activeTextEditor, undefined);
        await vscode.commands.executeCommand('liquidjava.showLogs');
        assert.ok(vscode.window.tabGroups.activeTabGroup.activeTab, 'opening logs must keep the walkthrough available');
    });
});
