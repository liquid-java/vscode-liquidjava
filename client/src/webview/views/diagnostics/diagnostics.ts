import { LJDiagnostic, LJError, LJWarning } from "../../../types/diagnostics";
import type { VCImplication, VCSimplificationResult } from "../../../types/vc-implications";
import { copyToClipboard } from "../../clipboard";
import { renderCodiconButton } from "../../icons";
import { getFileName } from "../../utils";
import { renderErrors } from "./errors";
import { renderMainHeader } from "../sections";
import { renderWarnings } from "./warnings";

export function renderDiagnosticsView(
    diagnostics: LJDiagnostic[],
    showAll: boolean,
    currentFile: string | undefined,
): string {
    const fileDiagnostics = diagnostics.filter(diagnostic => diagnostic.file?.toLowerCase() === currentFile?.toLowerCase() || !diagnostic.file);
    const displayDiagnostics = showAll ? diagnostics : fileDiagnostics;
    const errors = displayDiagnostics.filter(d => d.category === 'error') as LJError[];
    const warnings = displayDiagnostics.filter(d => d.category === 'warning') as LJWarning[];
    const totalErrors = diagnostics.filter(d => d.category === 'error').length;
    const hasErrors = totalErrors > 0;
    const hiddenErrors = totalErrors - errors.length;
    const titleMessage = hasErrors ? "Failed Verification" : "Passed Verification";
    const infoMessage = hasErrors ? 
        `${totalErrors} error${totalErrors !== 1 ? 's were' : ' was'} found by the LiquidJava verifier` :
        "No errors were found by the LiquidJava verifier.";
    
    return /*html*/`
        <div>
            ${renderMainHeader(titleMessage, 'diagnostics')}
            <p class="info">${infoMessage}</p>
            ${
                diagnostics.length === 0 ? '' : /*html*/`
                    <button id="show-all-button" class="underline-button">
                        ${showAll ? `Show file diagnostics` : `Show all diagnostics`}
                    </button>
                `
            }
            <div class="content">
                ${renderErrors(errors)}
                ${renderWarnings(warnings)}
                ${displayDiagnostics.length > 0 && hiddenErrors > 0 ? /*html*/`
                    <p class="more-indicator">(+${hiddenErrors} error${hiddenErrors !== 1 ? 's' : ''})</p>
                ` : ''}
            </div>
        </div>
    `;
}

export function getDisplayDiagnostics(diagnostics: LJDiagnostic[], showAll: boolean, currentFile: string | undefined): LJDiagnostic[] {
    if (showAll) return diagnostics;
    return diagnostics.filter(diagnostic => diagnostic.file?.toLowerCase() === currentFile?.toLowerCase() || !diagnostic.file);
}

export function renderCopyDiagnosticButton(indexType: 'error' | 'warning', index: number): string {
    return renderCodiconButton("copy", {
        className: "copy-diagnostic-btn",
        title: "Copy diagnostic",
        attributes: `data-${indexType}-index="${index}"`,
    });
}

export async function copyDiagnosticToClipboard(button: any, displayDiagnostics: LJDiagnostic[]) {
    const errorIndex = parseInt(button.getAttribute('data-error-index') || '-1', 10);
    const warningIndex = parseInt(button.getAttribute('data-warning-index') || '-1', 10);
    const diagnostic = errorIndex >= 0
        ? displayDiagnostics.filter(d => d.category === 'error')[errorIndex]
        : displayDiagnostics.filter(d => d.category === 'warning')[warningIndex];
    if (!diagnostic) return;

    const diagnosticText = formatDiagnosticForClipboard(diagnostic);
    await copyToClipboard(button, diagnosticText);
}

export function formatDiagnosticForClipboard(diagnostic: LJDiagnostic): string {
    const skippedFields = new Set(['category', 'type', 'translationTable', 'position', 'file', 'declarationPosition', 'stateMachine']);
    const lines: string[] = [];

    Object.entries(diagnostic).forEach(([key, value]) => {
        if (skippedFields.has(key)) return;

        const formattedValue = formatClipboardValue(value);
        if (!formattedValue) return;

        lines.push(`${formatClipboardLabel(key)}: ${formattedValue}`);
    });

    const location = formatDiagnosticLocation(diagnostic);
    if (location) lines.push(`Location: ${location}`);

    return lines.join('\n');
}

function formatClipboardLabel(key: string): string {
    return key
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/^./, char => char.toUpperCase());
}

function formatClipboardValue(value: unknown): string {
    if (value === null || value === undefined) return '';

    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);

    if (Array.isArray(value)) {
        const values = value.map(formatClipboardValue).filter(Boolean);
        if (values.length === 0) return '';
        return values.some(v => v.includes('\n')) ? `\n${values.join('\n')}` : values.join(', ');
    }

    if (isVCSimplificationResult(value)) return formatVCImplication(value.implication);
    if (isVCImplication(value)) return formatVCImplication(value);

    return JSON.stringify(value);
}

function isVCSimplificationResult(value: unknown): value is VCSimplificationResult {
    return typeof value === 'object'
        && value !== null
        && 'implication' in value
        && 'origin' in value;
}

function isVCImplication(value: unknown): value is VCImplication {
    return typeof value === 'object'
        && value !== null
        && 'predicate' in value
        && 'next' in value;
}

function formatVCImplication(node: VCImplication | null): string {
    if (!node) return '';

    const binder = node.name !== null && node.type !== null ? `∀${node.name}:${node.type}, ` : '';
    const current = `${binder}${node.predicate}`;
    const next = formatVCImplication(node.next);
    return next ? `${current}\n=> ${next}` : current;
}

function formatDiagnosticLocation(diagnostic: LJDiagnostic): string {
    if (!diagnostic.file || !diagnostic.position) return '';

    return `${getFileName(diagnostic.file)}:${diagnostic.position.lineStart + 1}`;
}
