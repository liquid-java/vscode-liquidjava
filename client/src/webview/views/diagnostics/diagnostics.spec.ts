import { afterEach, describe, expect, it } from 'vitest';
import type { CustomError, CustomWarning } from '../../../types/diagnostics';
import { renderDiagnosticsView } from './diagnostics';

const currentFile = 'file:///workspace/Current.java';
const otherFile = 'file:///workspace/Other.java';

function error(file = currentFile, title = 'Invalid refinement'): CustomError {
    return {
        category: 'error', type: 'custom-error', title,
        message: 'The refinement does not hold.', hint: null, file, position: null,
    };
}

function warning(file = currentFile): CustomWarning {
    return {
        category: 'warning', type: 'custom-warning', title: 'Verification warning',
        message: 'Some code could not be verified.', hint: null, file, position: null,
    };
}

function text(selector: string): string | undefined {
    return document.querySelector(selector)?.textContent?.trim();
}

afterEach(() => { document.body.innerHTML = ''; });

describe('diagnostics view', () => {
    it('selects Verification and counts errors in the current file and workspace', () => {
        document.body.innerHTML = renderDiagnosticsView([
            error(), error(otherFile, 'Other error'), warning(),
        ], false, currentFile);

        expect(text('.nav-tab.selected')).toBe('Verification');
        expect(text('.header h2')).toBe('');
        expect(text('[data-diagnostics-scope="file"] .diagnostics-scope-count')).toBe('1 error');
        expect(text('[data-diagnostics-scope="workspace"] .diagnostics-scope-count')).toBe('2 errors');
        expect(document.querySelector('[data-diagnostics-scope="file"]')?.classList.contains('selected')).toBe(true);
        expect(document.querySelector('[data-diagnostics-scope="workspace"]')?.classList.contains('selected')).toBe(false);
        expect(document.querySelectorAll('.error-item')).toHaveLength(1);
        expect(text('.error-item h3')).toBe('Invalid refinement');
        expect(text('.warning-item h3')).toBe('Verification warning');
        expect(text('.more-indicator')).toBe('(+1 error)');
        expect(document.querySelector('.info')).toBeNull();
    });

    it('shows workspace errors and warnings when show-all is selected', () => {
        document.body.innerHTML = renderDiagnosticsView([
            error(), error(otherFile, 'Other error'), warning(otherFile),
        ], true, currentFile);

        expect(document.querySelectorAll('.error-item')).toHaveLength(2);
        expect(document.querySelectorAll('.warning-item')).toHaveLength(1);
        expect(document.querySelector('[data-diagnostics-scope="workspace"]')?.classList.contains('selected')).toBe(true);
        expect(document.querySelector('[data-diagnostics-scope="file"]')?.classList.contains('selected')).toBe(false);
        expect(document.querySelector('.more-indicator')).toBeNull();
    });

    it('shows zero current-file errors and a plural hidden-error indicator', () => {
        document.body.innerHTML = renderDiagnosticsView([
            warning(), error(otherFile), error(otherFile, 'Second error'),
        ], false, currentFile);

        expect(text('[data-diagnostics-scope="file"] .diagnostics-scope-count')).toBe('0 errors');
        expect(document.querySelectorAll('.error-item')).toHaveLength(0);
        expect(document.querySelectorAll('.warning-item')).toHaveLength(1);
        expect(text('.more-indicator')).toBe('(+2 errors)');
        expect(text('.header h2')).toBe('');
    });

    it('offers only the workspace scope when there is no current file', () => {
        document.body.innerHTML = renderDiagnosticsView([error(), warning()], true, undefined);

        expect(document.querySelector('[data-diagnostics-scope="file"]')).toBeNull();
        expect(text('[data-diagnostics-scope="workspace"] .diagnostics-scope-count')).toBe('1 error');
        expect(document.querySelectorAll('.diagnostic-item')).toHaveLength(2);
    });

    it('shows passed verification for an empty result', () => {
        document.body.innerHTML = renderDiagnosticsView([], false, currentFile);

        expect(text('.header h2')).toBe('Passed Verification');
        expect(text('.info')).toBe('No errors were found by the LiquidJava verifier.');
        expect(document.querySelector('.diagnostics-scopes')).toBeNull();
        expect(document.querySelectorAll('.diagnostic-item')).toHaveLength(0);
        expect(document.querySelector('#show-all-button')).toBeNull();
    });

    it.each([false, true])('keeps warnings in the passed state (showAll=%s)', showAll => {
        document.body.innerHTML = renderDiagnosticsView([warning(), warning(otherFile)], showAll, currentFile);

        expect(text('.header h2')).toBe('Passed Verification');
        expect(document.querySelectorAll('.warning-item')).toHaveLength(showAll ? 2 : 1);
        expect(document.querySelectorAll('.error-item')).toHaveLength(0);
        expect(text('#show-all-button')).toBe(showAll ? 'Show file diagnostics' : 'Show all diagnostics');
        expect(document.querySelector('.diagnostics-scopes')).toBeNull();
    });
});
