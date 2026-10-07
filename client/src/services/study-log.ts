import * as vscode from 'vscode';
import { createHash, randomUUID } from 'node:crypto';
import * as path from 'node:path';
import { StudyWriter } from './study-writer';
import { extension } from '../state';
import type { LJDiagnostic } from '../types/diagnostics';

let study: StudyLog | undefined;
let pendingFlush = Promise.resolve();
let launchSession: string | undefined;

export function logStudy(event: string, data?: Record<string, unknown>) {
    study?.log(event, data);
}

export function isStudyEnabled() {
    return Boolean(study);
}

type VerificationEvent = { phase: string; uri: string; trigger: string; run: string; durationMs: number; result: string };

export function handleStudyVerification(event: VerificationEvent) {
    study?.verification(event);
}

export function studyDiagnostics(diagnostics: LJDiagnostic[]) {
    study?.updateDiagnostics(diagnostics);
}

export function studyVerificationCancelled() {
    study?.cancelVerification();
}

export async function flushStudyLog() {
    await pendingFlush;
    await study?.writer.flush();
}

export async function stopStudyLog() {
    const previous = study;
    study = undefined;
    await pendingFlush;
    await previous?.stop();
}

export function registerStudyLog(context: vscode.ExtensionContext) {
    const configure = () => {
        const previous = study;
        study = undefined;
        if (previous) pendingFlush = Promise.all([pendingFlush, previous.stop()]).then(() => {});
        // the language server verifies the first workspace folder
        const folder = vscode.workspace.workspaceFolders?.[0];
        if (!folder || folder.uri.scheme !== 'file') return;
        const config = vscode.workspace.getConfiguration('liquidjava.study', folder.uri);
        if (!config.get<boolean>('enabled', false)) return;
        const relativePath = config.get<string>('logPath', '.liquidjava/study-log.jsonl');
        const root = folder.uri.fsPath;
        const destination = path.resolve(root, relativePath);
        if (!relativePath || path.isAbsolute(relativePath) || !isInside(root, destination)) {
            void vscode.window.showWarningMessage('LiquidJava study logPath must be a file path inside the first workspace folder.');
            return;
        }
        study = new StudyLog(root, destination, config.get<string>('participantId', ''));
    };
    const reconfigure = () => {
        configure();
        void extension.client?.sendNotification('liquidjava/studyLogging', isStudyEnabled());
        extension.webview?.sendMessage({ type: 'study', enabled: isStudyEnabled() });
    };
    configure();
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('liquidjava.study')) reconfigure();
        }),
        vscode.workspace.onDidChangeWorkspaceFolders(reconfigure),
        new vscode.Disposable(() => {
            if (study) pendingFlush = Promise.all([pendingFlush, study.stop()]).then(() => {});
            study = undefined;
        }),
        vscode.commands.registerCommand('liquidjava.study.revealLog', async () => {
            logStudy('command_run', { command: 'liquidjava.study.revealLog' });
            if (!study) {
                void vscode.window.showInformationMessage('LiquidJava study logging is disabled.');
                return;
            }
            const writer = study.writer;
            await flushStudyLog();
            await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(vscode.Uri.file(writer.path)));
        }),
    );
}

function isInside(root: string, file: string) {
    const relative = path.relative(root, file);
    return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

class StudyLog {
    readonly writer: StudyWriter;
    private subscriptions: vscode.Disposable[] = [];
    private focusedFile?: string;
    private edits = new Map<string, number>();
    private editTimer?: ReturnType<typeof setTimeout>;
    private diagnostics = new Map<string, Record<string, unknown>>();
    private runs = new Map<string, { file: string; trigger: string; started: number }>();

    constructor(private readonly root: string, destination: string, pid: string) {
        this.writer = new StudyWriter(destination, pid, launchSession ??= randomUUID(), () => {
            extension.logger?.client.error('Could not write LiquidJava study log.');
            void vscode.window.showWarningMessage('LiquidJava could not write the study log. Check the workspace log path and permissions.');
        }, pendingFlush);
        this.log('logging_started');
        this.log(vscode.window.state.focused ? 'window_focus' : 'window_blur');
        this.focus(vscode.window.activeTextEditor);
        this.updateDiagnostics(extension.diagnostics ?? []);
        if (extension.webview) this.log(extension.webview.isVisible() ? 'view_visible' : 'view_hidden');
        this.subscriptions.push(
            vscode.window.onDidChangeActiveTextEditor(editor => this.focus(editor)),
            vscode.window.onDidChangeWindowState(state => this.log(state.focused ? 'window_focus' : 'window_blur')),
            vscode.workspace.onDidOpenTextDocument(document => {
                if (document.uri.scheme === 'file' && document.languageId === 'java') this.log('file_opened', { file: document.uri.fsPath });
            }),
            vscode.workspace.onDidSaveTextDocument(document => {
                if (document.uri.scheme === 'file' && document.languageId === 'java') {
                    this.flushEdits();
                    this.log('file_saved', { file: document.uri.fsPath });
                }
            }),
            vscode.workspace.onDidChangeTextDocument(event => {
                const file = event.document.uri.fsPath;
                if (event.document.uri.scheme !== 'file' || event.document.languageId !== 'java' || !isInside(this.root, file) || !event.contentChanges.length) return;
                this.edits.set(file, (this.edits.get(file) ?? 0) + event.contentChanges.length);
                clearTimeout(this.editTimer);
                this.editTimer = setTimeout(() => this.flushEdits(), 500);
            }),
        );
    }

    log(event: string, data: Record<string, unknown> = {}) {
        if (typeof data.file === 'string') {
            if (!isInside(this.root, data.file)) return;
            data = { ...data, file: path.relative(this.root, data.file).split(path.sep).join('/') };
        }
        this.writer.log(event, data);
    }

    private focus(editor?: vscode.TextEditor) {
        const file = editor?.document.languageId === 'java' && editor.document.uri.scheme === 'file'
            && isInside(this.root, editor.document.uri.fsPath) ? editor.document.uri.fsPath : undefined;
        if (file === this.focusedFile) return;
        this.flushEdits();
        if (this.focusedFile) this.log('file_blurred', { file: this.focusedFile });
        this.focusedFile = file;
        if (file) this.log('file_focused', { file });
    }

    private flushEdits() {
        clearTimeout(this.editTimer);
        this.editTimer = undefined;
        for (const [file, count] of this.edits) this.log('file_edited', { file, count });
        this.edits.clear();
    }

    verification(event: VerificationEvent) {
        const file = vscode.Uri.parse(event.uri).fsPath;
        if (!isInside(this.root, file)) return;
        if (event.phase === 'started') {
            this.runs.set(event.run, { file, trigger: event.trigger, started: Date.now() });
            this.log('verify_started', { file, trigger: event.trigger, run: event.run });
        } else if (event.phase === 'finished' && this.runs.delete(event.run)) {
            this.log('verify_finished', { file, trigger: event.trigger, run: event.run, durationMs: event.durationMs, result: event.result });
        }
    }

    cancelVerification() {
        for (const [run, data] of this.runs) this.log('verify_finished', {
            file: data.file, trigger: data.trigger, run,
            durationMs: Date.now() - data.started, result: 'cancelled',
        });
        this.runs.clear();
    }

    updateDiagnostics(diagnostics: LJDiagnostic[]) {
        const next = new Map<string, Record<string, unknown>>();
        const unmatched = new Map(this.diagnostics);
        for (const diagnostic of diagnostics) {
            if (!isInside(this.root, diagnostic.file)) continue;
            const line = diagnostic.position ? diagnostic.position.lineStart + 1 : null;
            const column = diagnostic.position ? diagnostic.position.colStart + 1 : null;
            // preserve identity when edits move an existing error to another line
            const previous = [...unmatched.entries()]
                .filter(([, data]) => data.file === diagnostic.file && data.kind === diagnostic.type && data.category === diagnostic.category)
                .sort(([, a], [, b]) => Math.abs(Number(a.line) - Number(line)) - Math.abs(Number(b.line) - Number(line)))[0];
            const key = previous?.[0] ?? createHash('sha256').update(JSON.stringify([
                path.relative(this.root, diagnostic.file).split(path.sep).join('/'), diagnostic.type, diagnostic.category, line, column, next.size,
            ])).digest('hex');
            unmatched.delete(key);
            const data = { key, file: diagnostic.file, line, column, kind: diagnostic.type, category: diagnostic.category };
            next.set(key, data);
            if (!this.diagnostics.has(key)) this.log('diagnostic_shown', data);
        }
        for (const [, data] of unmatched) this.log('diagnostic_resolved', data);
        this.diagnostics = next;
    }

    stop() {
        this.subscriptions.forEach(subscription => subscription.dispose());
        this.flushEdits();
        if (this.focusedFile) this.log('file_blurred', { file: this.focusedFile });
        this.cancelVerification();
        this.log('logging_stopped');
        return this.writer.flush();
    }
}
