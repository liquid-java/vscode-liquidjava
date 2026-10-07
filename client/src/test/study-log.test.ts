import * as assert from 'node:assert/strict';
import { readFile, writeFile, rm, rmdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StudyWriter } from '../services/study-writer';
import * as vscode from 'vscode';
import type { LiquidJavaTestApi } from '../types/test-api';

suite('Opt-in LiquidJava study logging', () => {
    test('logs local metadata, stable diagnostic identity, and paired verification results', async () => {
        const installed = vscode.extensions.getExtension<LiquidJavaTestApi>('AlcidesFonseca.liquid-java')!;
        const api = await installed.activate();
        await api.ready;
        const folder = vscode.workspace.workspaceFolders![0];
        const config = vscode.workspace.getConfiguration('liquidjava.study', folder.uri);
        const settings = vscode.Uri.joinPath(folder.uri, '.vscode/settings.json');
        const originalSettings = await readFile(settings.fsPath).catch(() => undefined);
        const source = vscode.Uri.joinPath(folder.uri, 'src/main/java/FailingRefinement.java');
        const original = await readFile(source.fsPath, 'utf8');
        const log = vscode.Uri.joinPath(folder.uri, '.liquidjava/study-log.jsonl');
        const logExists = await readFile(log.fsPath).then(() => true, () => false);
        assert.equal(logExists, false, 'the isolated fixture must start without a study log');
        const readEvents = async (): Promise<any[]> => {
            const text = await readFile(log.fsPath, 'utf8').catch(() => '');
            return text.trim() ? text.trim().split('\n').map(line => JSON.parse(line)) : [];
        };
        const waitFor = async (predicate: (events: any[]) => boolean) => {
            const deadline = Date.now() + 20_000;
            while (Date.now() < deadline) {
                const events = await readEvents();
                if (predicate(events)) return events;
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            assert.fail(`missing expected study events: ${JSON.stringify(await readEvents())}`);
        };
        const verify = async () => {
            const result = new Promise<void>((resolve, reject) => {
                const diagnostics = api.onDiagnostics(() => { diagnostics.dispose(); failure.dispose(); resolve(); });
                const failure = api.onFailure(() => { diagnostics.dispose(); failure.dispose(); reject(new Error('verifier crashed')); });
            });
            await vscode.commands.executeCommand('liquidjava.verify');
            await result;
        };
        try {
            assert.equal(config.get('enabled'), false);
            await vscode.commands.executeCommand('liquidjava.showView');
            assert.equal(await readFile(log.fsPath).then(() => true, () => false), false);

            await config.update('participantId', 'P01', vscode.ConfigurationTarget.WorkspaceFolder);
            await config.update('enabled', true, vscode.ConfigurationTarget.WorkspaceFolder);
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
            await vscode.commands.executeCommand('liquidjava.stop');
            await vscode.commands.executeCommand('liquidjava.start');
            const document = await vscode.workspace.openTextDocument(source);
            await vscode.window.showTextDocument(document);
            await waitFor(events => events.some(event => event.event === 'verify_finished' && event.trigger === 'open'));
            await verify();
            let events = await waitFor(events => events.some(event => event.event === 'verify_finished' && event.trigger === 'manual'));
            const shown = events.find(event => event.event === 'diagnostic_shown' && event.kind === 'refinement-error');
            assert.ok(shown, 'an error must appear in the log');

            // moving the same diagnostic must not look like fixing it
            const move = new vscode.WorkspaceEdit();
            move.insert(source, new vscode.Position(0, 0), '\n');
            await vscode.workspace.applyEdit(move);
            await document.save();
            events = await waitFor(events => events.some(event => event.event === 'verify_finished' && event.trigger === 'save'));
            assert.equal(events.filter(event => event.event === 'diagnostic_resolved').length, 0);
            assert.equal(events.filter(event => event.event === 'diagnostic_shown' && event.kind === 'refinement-error').length, 1);

            const fix = new vscode.WorkspaceEdit();
            fix.replace(source, new vscode.Range(0, 0, document.lineCount, 0), original.replace('positive = -1', 'positive = 1'));
            await vscode.workspace.applyEdit(fix);
            await document.save();
            events = await waitFor(events => events.some(event => event.event === 'verify_finished' && event.result === 'passed'));
            const resolved = events.find(event => event.event === 'diagnostic_resolved');
            assert.equal(resolved.key, shown.key);
            assert.ok(Date.parse(resolved.t) >= Date.parse(shown.t));
            assert.ok(events.some(event => event.event === 'file_edited' && event.count > 0));
            assert.ok(events.some(event => event.event === 'file_saved'));
            assert.ok(events.some(event => event.event === 'file_focused'));
            assert.ok(events.some(event => event.event === 'window_focus' || event.event === 'window_blur'));
            for (const finished of events.filter(event => event.event === 'verify_finished')) {
                assert.ok(events.some(event => event.event === 'verify_started' && event.run === finished.run));
                assert.ok(finished.durationMs >= 0);
            }
            await vscode.commands.executeCommand('liquidjava.study.revealLog');
            assert.equal(vscode.window.activeTextEditor?.document.uri.fsPath, log.fsPath);
            await config.update('enabled', false, vscode.ConfigurationTarget.WorkspaceFolder);
            events = await waitFor(events => events.some(event => event.event === 'logging_stopped'));
            const before = await readFile(log.fsPath, 'utf8');
            await vscode.commands.executeCommand('liquidjava.showView');
            await new Promise(resolve => setTimeout(resolve, 600));
            assert.equal(await readFile(log.fsPath, 'utf8'), before);
            assert.ok(events.every(event => event.pid === 'P01' && event.session && event.t));
            assert.equal(new Set(events.map(event => event.session)).size, 1);
            assert.ok(events.every(event => !event.file || event.file === 'src/main/java/FailingRefinement.java'));
            assert.ok(!before.includes('_ > 0') && !before.includes('positive') && !before.includes('int valid'));
        } finally {
            await config.update('enabled', undefined, vscode.ConfigurationTarget.WorkspaceFolder);
            await config.update('participantId', undefined, vscode.ConfigurationTarget.WorkspaceFolder);
            await writeFile(source.fsPath, original);
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
            await rm(log.fsPath, { force: true });
            await rmdir(vscode.Uri.joinPath(folder.uri, '.liquidjava').fsPath).catch(() => {});
            if (originalSettings) await writeFile(settings.fsPath, originalSettings);
            else {
                await rm(settings.fsPath, { force: true });
                await rmdir(vscode.Uri.joinPath(folder.uri, '.vscode').fsPath).catch(() => {});
            }
        }
    });

    test('serializes final writes before a replacement logger starts writing', async () => {
        const folder = await mkdtemp(join(tmpdir(), 'liquidjava-study-'));
        const destination = join(folder, 'study.jsonl');
        let release: () => void;
        const gate = new Promise<void>(resolve => { release = resolve; });
        const onError = () => assert.fail('study log write failed');
        const first = new StudyWriter(destination, 'P01', 'session', onError, gate);
        first.log('logging_stopped');
        const stopped = first.flush();
        const second = new StudyWriter(destination, 'P01', 'session', onError, stopped);
        second.log('logging_started');
        const started = second.flush();
        try {
            await new Promise(resolve => setTimeout(resolve, 300));
            assert.equal(await readFile(destination).then(() => true, () => false), false);
            release!();
            await started;
            const events = (await readFile(destination, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
            assert.deepEqual(events.map(event => event.event), ['logging_stopped', 'logging_started']);
        } finally {
            release!();
            await Promise.all([stopped, started]);
            await rm(folder, { recursive: true, force: true });
        }
    });
});
