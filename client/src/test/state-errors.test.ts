import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { LJDiagnostic, StateRefinementError } from '../types/diagnostics';
import type { LJStateMachine } from '../types/fsm';
import type { LiquidJavaTestApi, WebviewMessage } from '../types/test-api';

suite('Bundled LiquidJava state machine errors', () => {
    test('sends the webview state errors with their machine and shows them on it from the editor', async () => {
        const installed = vscode.extensions.getExtension<LiquidJavaTestApi>('AlcidesFonseca.liquid-java');
        assert.ok(installed);
        const api = await installed.activate();
        await api.ready;

        const workspace = vscode.workspace.workspaceFolders?.[0];
        assert.ok(workspace);
        const refinementsUri = vscode.Uri.joinPath(workspace.uri, 'src/main/java/TreeNodeRefinements.java');
        const callerUri = vscode.Uri.joinPath(workspace.uri, 'src/main/java/FailingTreeNodeState.java');
        const sameFile = (file: string, uri: vscode.Uri) => vscode.Uri.file(path.resolve(file)).fsPath === uri.fsPath;
        const isStateError = (diagnostic: LJDiagnostic): diagnostic is StateRefinementError =>
            diagnostic.type === 'state-refinement-error' && sameFile(diagnostic.file, callerUri);
        const subscriptions: vscode.Disposable[] = [];
        const nextWebviewMessage = <T>(description: string, matches: (event: WebviewMessage) => T | undefined) =>
            new Promise<T>((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${description}`)), 90_000);
                const done = (callback: () => void) => {
                    clearTimeout(timeout);
                    subscription.dispose();
                    failure.dispose();
                    callback();
                };
                const subscription = api.onWebviewMessage(event => {
                    const value = matches(event);
                    if (value !== undefined) done(() => resolve(value));
                });
                const failure = api.onFailure(() =>
                    done(() => reject(new Error(`LiquidJava verifier crashed while waiting for ${description}`))));
                subscriptions.push(subscription, failure, { dispose: () => clearTimeout(timeout) });
            });

        try {
            // hide the view first so showing it always loads a fresh webview
            await vscode.commands.executeCommand('workbench.action.closeSidebar');
            const ready = nextWebviewMessage('the webview to be ready', event =>
                event.direction === 'fromWebview' && event.message.type === 'ready' ? true : undefined);
            await vscode.commands.executeCommand('liquidjava.showView');
            await ready;

            const machine = nextWebviewMessage('the refinements file state machine', event =>
                event.direction === 'toWebview' && event.message.type === 'fsm' && event.message.sm
                    ? event.message.sm as LJStateMachine : undefined);
            const stateError = nextWebviewMessage('the state error diagnostics', event =>
                event.direction === 'toWebview' && event.message.type === 'diagnostics'
                    ? (event.message.diagnostics as LJDiagnostic[]).find(isStateError) : undefined);
            const document = await vscode.workspace.openTextDocument(refinementsUri);
            await vscode.window.showTextDocument(document);
            await vscode.commands.executeCommand('liquidjava.verify');

            const [sm, error] = await Promise.all([machine, stateError]);
            assert.equal(sm.className, 'javax.swing.tree.DefaultMutableTreeNode');
            assert.ok(error.stateMachine, 'the state error must carry its state machine');
            assert.equal(error.stateMachine.className, sm.className, 'errors are matched to the machine by class');
            assert.ok(error.stateMachine.errorContext, 'the state error must carry its error context');
            assert.ok(error.position && sameFile(error.position.file ?? error.file, callerUri));
            assert.ok(error.declarationPosition?.file && sameFile(error.declarationPosition.file, refinementsUri));

            // the editor offers to show the state error on its state machine
            await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(callerUri));
            const codeLenses = await vscode.commands.executeCommand<vscode.CodeLens[]>('vscode.executeCodeLensProvider', callerUri);
            const stateMachineLens = codeLenses.find(codeLens => codeLens.command?.title === 'Show in state machine');
            assert.ok(stateMachineLens?.command, 'state errors must have a CodeLens to show them on the state machine');
            assert.equal(stateMachineLens.command.command, 'liquidjava.showView');
            const [target, tab] = stateMachineLens.command.arguments ?? [];
            assert.equal(tab, 'fsm');
            assert.deepEqual(target.position, error.position);

            const reveal = nextWebviewMessage('the state error to be shown on the state machine', event =>
                event.direction === 'toWebview' && event.message.type === 'revealDiagnostic' ? event.message : undefined);
            await vscode.commands.executeCommand(stateMachineLens.command.command, ...stateMachineLens.command.arguments!);
            const message = await reveal;
            assert.equal(message.tab, 'fsm');
            assert.deepEqual((message.diagnostic as { position: unknown }).position, error.position);
        } finally {
            subscriptions.forEach(subscription => subscription.dispose());
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        }
    });
});
