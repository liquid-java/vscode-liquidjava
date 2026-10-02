import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { LJDiagnostic } from '../types/diagnostics';
import type { LiquidJavaTestApi } from '../types/test-api';

suite('Bundled LiquidJava extension', () => {
    test('activates, becomes ready, and verifies the failing fixture', async () => {
        const installed = vscode.extensions.getExtension<LiquidJavaTestApi>('AlcidesFonseca.liquid-java');
        assert.ok(installed, 'LiquidJava must be loaded in the Extension Host');
        assert.equal(installed.packageJSON.main, './dist/extension.js');

        const api = await installed.activate();
        assert.ok(installed.isActive);
        await api.ready;
        assert.notEqual(api.getState().status, 'stopped');

        const workspace = vscode.workspace.workspaceFolders?.[0];
        assert.ok(workspace, 'the failing fixture must have its own workspace');
        const uri = vscode.Uri.joinPath(workspace.uri, 'src/main/java/FailingRefinement.java');
        const document = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(document);

        let subscription: vscode.Disposable | undefined;
        const diagnosticsReceived = new Promise<LJDiagnostic[]>((resolve) => {
            subscription = api.onDiagnostics((diagnostics) => {
                if (diagnostics.some(d => d.type === 'refinement-error' && path.resolve(d.file) === uri.fsPath)) {
                    resolve(diagnostics);
                }
            });
        });
        try {
            await vscode.commands.executeCommand('liquidjava.verify');
            const diagnostics = await diagnosticsReceived;
            const error = diagnostics.find(d => d.type === 'refinement-error' && path.resolve(d.file) === uri.fsPath);
            assert.ok(error);
            assert.equal(error.category, 'error');
            assert.equal(error.title, 'Refinement Error');
            assert.ok(error.position, 'the diagnostic must identify the invalid assignment');
            assert.equal(api.getState().status, 'failed');
            assert.deepEqual(api.getState().diagnostics, diagnostics);
        } finally {
            subscription?.dispose();
        }
    });
});
