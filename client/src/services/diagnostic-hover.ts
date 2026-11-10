import * as vscode from 'vscode';
import { extension } from '../state';
import type { LJDiagnostic, LJSourceReference } from '../types/diagnostics';
import { normalizeFilePath } from '../utils/utils';

const CODE_SPAN = /(`+)([\s\S]+?)(?<!`)\1(?!`)/y;

// the notes and the counterexample of the LiquidJava errors at a position, in markdown
export function formatDiagnosticNotes(document: vscode.TextDocument, position: vscode.Position): string | null {
    const file = normalizeFilePath(document.uri.fsPath);
    const lines = (extension.diagnostics ?? [])
        .filter(d => d.category === 'error' && d.position && d.file && normalizeFilePath(d.file) === file)
        .filter(d => new vscode.Range(d.position!.lineStart, d.position!.colStart, d.position!.lineEnd, d.position!.colEnd).contains(position))
        .flatMap(d => [...d.messageNotes.map(note => toMarkdown(note, d.references)), ...counterexample(d)]);
    return lines.length > 0 ? lines.join('  \n') : null;
}

function counterexample(d: LJDiagnostic): string[] {
    if (d.type !== 'refinement-error' || d.counterexample.assignments.length === 0) return [];
    return ['Counterexample: ' + d.counterexample.assignments.map(a => `\`${a.variable} == ${a.value}\``).join(' && ')];
}

function toMarkdown(message: string, references: LJSourceReference[]): string {
    const links = references.filter(r => r.message === message);
    let md = '';
    let i = 0;
    while (i < message.length) {
        const link = links.find(r => r.start === i);
        if (link && link.position.file) {
            const uri = vscode.Uri.file(link.position.file).with({ fragment: `L${link.position.lineStart + 1},${link.position.colStart + 1}` });
            md += `[${escape(link.text)}](${uri.toString()})`;
            i += link.text.length;
            continue;
        }
        CODE_SPAN.lastIndex = i;
        const span = message[i] === '`' ? CODE_SPAN.exec(message) : null;
        if (span) { md += span[0]; i += span[0].length; continue; }
        md += escape(message[i]);
        i++;
    }
    return md;
}

function escape(text: string): string {
    return text.replace(/[\\*_[\]<>#|]/g, c => `\\${c}`);
}
