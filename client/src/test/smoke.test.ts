import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { LJDiagnostic } from '../types/diagnostics';
import type { LiquidJavaTestApi } from '../types/test-api';

suite('Bundled LiquidJava extension', () => {
    test('activates, becomes ready, and verifies its isolated fixture', async () => {
        const installed = vscode.extensions.getExtension<LiquidJavaTestApi>('AlcidesFonseca.liquid-java');
        assert.ok(installed, 'LiquidJava must be loaded in the Extension Host');
        assert.equal(installed.packageJSON.main, './dist/extension.js');

        const api = await installed.activate();
        assert.ok(installed.isActive);
        await api.ready;
        assert.notEqual(api.getState().status, 'stopped');

        const workspace = vscode.workspace.workspaceFolders?.[0];
        assert.ok(workspace, 'the fixture must have its own workspace');
        const passing = path.basename(workspace.uri.fsPath) === 'passing';
        const file = passing ? 'PassingRefinement.java' : 'FailingRefinement.java';
        const uri = vscode.Uri.joinPath(workspace.uri, `src/main/java/${file}`);
        const subscriptions: vscode.Disposable[] = [];
        const nextFixtureDiagnostics = () => new Promise<LJDiagnostic[]>((resolve, reject) => {
            const dispose = () => {
                diagnosticsSubscription.dispose();
                failureSubscription.dispose();
            };
            const diagnosticsSubscription = api.onDiagnostics((diagnostics) => {
                dispose();
                resolve(diagnostics);
            });
            const failureSubscription = api.onFailure(() => {
                dispose();
                reject(new Error(`LiquidJava verifier crashed while checking ${file} (status: ${api.getState().status})`));
            });
            subscriptions.push(diagnosticsSubscription, failureSubscription);
        });
        try {
            // settle automatic verification before testing the manual command
            const initialDiagnostics = nextFixtureDiagnostics();
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
            await initialDiagnostics;

            const manualDiagnostics = nextFixtureDiagnostics();
            await vscode.commands.executeCommand('liquidjava.verify');
            const diagnostics = await manualDiagnostics;
            if (passing) {
                assert.deepEqual(diagnostics, [], 'correct code must emit an explicit empty result');
                assert.equal(api.getState().status, 'passed');
            } else {
                const error = diagnostics.find(d => d.type === 'refinement-error' && vscode.Uri.file(path.resolve(d.file)).fsPath === uri.fsPath);
                assert.ok(error, `expected a refinement error for ${file}; received ${JSON.stringify(diagnostics)}`);
                assert.equal(error.category, 'error');
                assert.equal(error.title, 'Refinement Error');
                assert.ok(error.position, 'the diagnostic must identify the invalid assignment');
                assert.equal(api.getState().status, 'failed');
            }
            assert.deepEqual(api.getState().diagnostics, diagnostics);
        } finally {
            subscriptions.forEach(subscription => subscription.dispose());
        }
    });
});
