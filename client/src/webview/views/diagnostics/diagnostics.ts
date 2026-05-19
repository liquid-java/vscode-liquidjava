import { LJDiagnostic, LJError, LJWarning } from "../../../types/diagnostics";
import { renderCodicon } from "../../icons";
import { renderErrors } from "./errors";
import { renderMainHeader } from "../sections";
import { renderWarnings } from "./warnings";

const COPY_BUTTON_RESET_MS = 2000;

export function renderDiagnosticsView(
    diagnostics: LJDiagnostic[],
    showAll: boolean,
    currentFile: string | undefined,
    expandedErrors: Set<number>,
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
                ${renderErrors(errors, expandedErrors)}
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
    return /*html*/`<button class="copy-diagnostic-btn" data-${indexType}-index="${index}" title="Copy diagnostic" aria-label="Copy diagnostic">${renderCodicon("copy")}</button>`;
}

export async function copyDiagnosticToClipboard(button: any, displayDiagnostics: LJDiagnostic[]) {
    const errorIndex = parseInt(button.getAttribute('data-error-index') || '-1', 10);
    const warningIndex = parseInt(button.getAttribute('data-warning-index') || '-1', 10);
    const diagnostic = errorIndex >= 0
        ? displayDiagnostics.filter(d => d.category === 'error')[errorIndex]
        : displayDiagnostics.filter(d => d.category === 'warning')[warningIndex];
    if (!diagnostic) return;

    const diagnosticText = formatDiagnosticForClipboard(diagnostic);
    const originalTitle = button.getAttribute('title');
    const originalContent = button.innerHTML;

    try {
        button.disabled = true;
        await navigator.clipboard.writeText(diagnosticText);
        button.classList.add('copied');
        button.setAttribute('title', 'Copied!');
    } catch (e) {
        button.setAttribute('title', 'Copy failed');
    } finally {
        setTimeout(() => {
            button.innerHTML = originalContent;
            button.setAttribute('title', originalTitle);
            button.classList.remove('copied');
            button.disabled = false;
        }, COPY_BUTTON_RESET_MS);
    }
}

export function formatDiagnosticForClipboard(diagnostic: LJDiagnostic): string {
    const skippedFields = new Set(['category', 'type', 'translationTable', 'position', 'file']);
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

    if (typeof value === 'object' && 'value' in value) {
        return formatClipboardValue((value as { value: unknown }).value);
    }

    return JSON.stringify(value);
}

function formatDiagnosticLocation(diagnostic: LJDiagnostic): string {
    if (!diagnostic.file || !diagnostic.position) return '';

    const filename = diagnostic.file.split('/').pop()?.trim() || diagnostic.file;
    return `${filename}:${diagnostic.position.lineStart + 1}`;
}
