import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { LJDiagnostic } from '../types/diagnostics';
import type { LJContext } from '../types/context';
import type { LiquidJavaTestApi } from '../types/test-api';

suite('Bundled LiquidJava webview and lifecycle', () => {
    test('sends verification messages and verifies again after Stop, Start, and Restart', async () => {
        const installed = vscode.extensions.getExtension<LiquidJavaTestApi>('AlcidesFonseca.liquid-java');
        assert.ok(installed);
        const api = await installed.activate();
        await api.ready;

        const workspace = vscode.workspace.workspaceFolders?.[0];
        assert.ok(workspace);
        const uri = vscode.Uri.joinPath(workspace.uri, 'src/main/java/FailingRefinement.java');
        const sameFile = (file: string) => vscode.Uri.file(path.resolve(file)).fsPath === uri.fsPath;
        const subscriptions: vscode.Disposable[] = [];
        const nextEvent = <T>(event: vscode.Event<T>, matches: (value: T) => boolean) =>
            new Promise<T>(resolve => {
                const subscription = event(value => {
                    if (matches(value)) {
                        subscription.dispose();
                        resolve(value);
                    }
                });
                subscriptions.push(subscription);
            });
        const isFixtureDiagnostic = (diagnostics: LJDiagnostic[]) => diagnostics.some(diagnostic =>
            diagnostic.type === 'refinement-error' && sameFile(diagnostic.file));
        const nextDiagnostics = () => nextEvent(api.onDiagnostics, isFixtureDiagnostic);
        const assertServerRunning = () => {
            const pid = api.getState().serverPid;
            assert.ok(pid, 'the bundled extension must expose its running Java server');
            assert.doesNotThrow(() => process.kill(pid, 0));
            return pid;
        };
        const assertServerStopped = (pid: number) => {
            assert.equal(api.getState().serverPid, undefined);
            assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' }, 'Stop must terminate the Java process');
            assert.equal(api.getState().status, 'stopped');
            assert.deepEqual(api.getState().diagnostics, []);
        };

        try {
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
            await vscode.commands.executeCommand('liquidjava.stop');
            await vscode.commands.executeCommand('liquidjava.start');
            const ready = nextEvent(api.onWebviewMessage, event =>
                event.direction === 'fromWebview' && event.message.type === 'ready');
            await vscode.commands.executeCommand('liquidjava.showView');
            await ready;

            const initialDiagnostics = nextDiagnostics();
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
            await initialDiagnostics;

            const diagnosticMessage = nextEvent(api.onWebviewMessage, event =>
                event.direction === 'toWebview' && event.message.type === 'diagnostics' &&
                isFixtureDiagnostic(event.message.diagnostics));
            const contextMessage = nextEvent(api.onWebviewMessage, event =>
                event.direction === 'toWebview' && event.message.type === 'context');
            const manualDiagnostics = nextDiagnostics();
            await vscode.commands.executeCommand('liquidjava.verify');
            assert.equal(api.getState().status, 'loading');
            const [diagnostics, outboundDiagnostics, outboundContext] = await Promise.all([
                manualDiagnostics, diagnosticMessage, contextMessage,
            ]);
            assert.deepEqual(outboundDiagnostics.message.diagnostics, diagnostics);
            const context: LJContext = outboundContext.message.context;
            const valid = context.localVars.find(variable => variable.name === 'valid');
            assert.ok(valid, JSON.stringify(context));
            assert.ok(valid.position);
            assert.ok(sameFile(valid.position.file));
            assert.equal(valid.type, 'int');
            assert.ok(valid.mainRefinement.includes('> 0'));
            assert.equal(api.getState().status, 'failed');

            const originalPid = assertServerRunning();
            const stopped = nextEvent(api.onWebviewMessage, event =>
                event.direction === 'toWebview' && event.message.type === 'status' && event.message.status === 'stopped');
            await vscode.commands.executeCommand('liquidjava.stop');
            await stopped;
            assertServerStopped(originalPid);

            const startDiagnostics = nextDiagnostics();
            await vscode.commands.executeCommand('liquidjava.start');
            await startDiagnostics;
            const startedPid = assertServerRunning();
            assert.notEqual(startedPid, originalPid);
            assert.equal(api.getState().status, 'failed');

            const restartStopped = nextEvent(api.onWebviewMessage, event =>
                event.direction === 'toWebview' && event.message.type === 'status' && event.message.status === 'stopped');
            const restartDiagnostics = nextDiagnostics();
            await vscode.commands.executeCommand('liquidjava.restart');
            await restartStopped;
            await restartDiagnostics;
            const restartedPid = assertServerRunning();
            assert.notEqual(restartedPid, startedPid);
            assert.throws(() => process.kill(startedPid, 0), { code: 'ESRCH' });

            const finalDiagnostics = nextDiagnostics();
            await vscode.commands.executeCommand('liquidjava.verify');
            await finalDiagnostics;
            assert.equal(api.getState().status, 'failed');
        } finally {
            subscriptions.forEach(subscription => subscription.dispose());
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
            await vscode.commands.executeCommand('liquidjava.stop');
            await vscode.commands.executeCommand('liquidjava.start');
        }
    });
});
