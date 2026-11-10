import { afterEach, describe, expect, it } from 'vitest';
import type { CustomError, CustomWarning, StateRefinementError } from '../../../types/diagnostics';
import { renderLocation } from '../sections';
import { formatDiagnosticForClipboard, renderDiagnosticsView } from './diagnostics';

const currentFile = 'file:///workspace/Current.java';
const otherFile = 'file:///workspace/Other.java';

function error(file = currentFile, title = 'Invalid refinement'): CustomError {
    return {
        category: 'error', type: 'custom-error', title,
        message: 'The refinement does not hold.', hints: [], messageNotes: [], references: [], file, position: null,
    };
}

function warning(file = currentFile): CustomWarning {
    return {
        category: 'warning', type: 'custom-warning', title: 'Verification warning',
        message: 'Some code could not be verified.', hints: [], messageNotes: [], references: [], file, position: null,
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

    it('shows the code of notes and hints in the editor font, and links the lines they name', () => {
        const note = 'Origin: line 134, `new BufferedInputStream(stream)` makes `markState(b) == unmarked`';
        const position = { file: '/workspace/Reader.java', lineStart: 133, colStart: 8, lineEnd: 133, colEnd: 8 };
        document.body.innerHTML = renderDiagnosticsView([{
            ...error(), messageNotes: [note], references: [{ message: note, text: 'line 134', start: 8, position }],
            hints: [{ kind: 'general', message: "Call `` b.f('`') `` first" }],
        }], false, currentFile);

        const link = document.querySelector('.message-note a.location-link');
        expect(link?.textContent).toBe('line 134');
        expect([link?.getAttribute('data-file'), link?.getAttribute('data-line')]).toEqual(['/workspace/Reader.java', '133']);
        expect(text('.message-note')).toBe('Origin: line 134, new BufferedInputStream(stream) makes markState(b) == unmarked');
        expect(Array.from(document.querySelectorAll('.lj-code')).map(code => code.textContent))
            .toEqual(['new BufferedInputStream(stream)', 'markState(b) == unmarked', "b.f('`')"]);
    });

    it('shows every declaration of a refinement with their notes under them', () => {
        const declaredAt = (lineStart: number) =>
            ({ file: '/workspace/DoorRefinements.java', lineStart, colStart: 29, lineEnd: lineStart, colEnd: 58 });
        const stateError = {
            ...error(), type: 'state-refinement-error', declarationPosition: declaredAt(12),
            declarationPositions: [declaredAt(12), declaredAt(13)],
            declarationNotes: ['where closed(this) means doorState(this) == closed', 'where ajar(this) means doorState(this) == ajar'],
        } as unknown as StateRefinementError;
        document.body.innerHTML = renderLocation(stateError);

        expect(Array.from(document.querySelectorAll('pre > *')).map(element => element.textContent)).toEqual([
            'DoorRefinements.java:13', 'DoorRefinements.java:14',
            'where closed(this) means doorState(this) == closed', 'where ajar(this) means doorState(this) == ajar',
        ]);
        expect(document.querySelector('pre > :last-child')?.className).toBe('location-note');
        // the copied error keeps the notes but not the raw positions
        expect(formatDiagnosticForClipboard(stateError)).toContain('Declaration Notes: where closed(this) means');
        expect(formatDiagnosticForClipboard(stateError)).not.toContain('Declaration Positions');
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
