import { afterEach, describe, expect, it } from 'vitest';
import type { RefinementError } from '../../../types/diagnostics';
import type { VCImplication, VCSimplificationResult } from '../../../types/vc-implications';
import { handleVCImplicationStepClick, renderVCImplication } from './vc-implications';

// a VC chain from its rows, each a binder and its predicate
function chain(...rows: ReadonlyArray<readonly [string, string]>): VCImplication {
    return rows.reduceRight<VCImplication | null>(
        (next, [name, predicate]) => ({ name, type: 'int', predicate, next }), null,
    ) as VCImplication;
}

// a derivation from its steps, oldest first, each the pass that produced it and its chain
function derivation(...steps: Array<[string | null, VCImplication]>): VCSimplificationResult {
    return steps.reduce<VCSimplificationResult | null>(
        (origin, [simplification, implication]) => ({ implication, origin, simplification }), null,
    ) as VCSimplificationResult;
}

function render(found: VCSimplificationResult, message = 'found ... but expected ...'): void {
    const error = {
        file: 'A.java', position: null, title: 'Refinement Error', message,
    } as unknown as RefinementError;
    document.body.innerHTML = renderVCImplication(error, found);
}

function shown() {
    return {
        label: document.querySelector('.vc-step-name')?.textContent,
        info: document.querySelector('.vc-step-info')?.getAttribute('title'),
        position: document.querySelector('.vc-step-position')?.textContent?.trim(),
        // each line of the chain, its binder and the lines its predicate is laid out on
        lines: Array.from(document.querySelectorAll('.vc-line'), line => Array.from(
            line.querySelectorAll('.vc-binder, .lj-line'), part => part.textContent?.replace(/\s+/gu, ' ').trim(),
        ).join(' ')),
    };
}

function previous(): void {
    handleVCImplicationStepClick(document.querySelector('.vc-step-previous-btn')!);
}

afterEach(() => { document.body.innerHTML = ''; });

describe('Found', () => {
    it('shows every step of the verifier, each under its name with what changed in the tooltip', () => {
        const states = 'tiling(p) == tilingNotExplicit && compression(p) == compressionNotExplicit';
        render(derivation(
            [null, chain(['#if_condition', '#if_condition'], ['p', states])],
            ['Binder', chain(['#if_condition', 'true'], ['p', states])],
            ['Binder', chain(['p', states])],
            ['Relevant to Expected', chain(['p', 'compression(p) == compressionNotExplicit'])],
        ));

        expect(shown()).toEqual({
            label: 'Relevant to Expected', info: 'Kept only the facts that Expected depends on, directly or through other facts.',
            position: '4/4', lines: ['∀p compression(p) == compressionNotExplicit'],
        });
        previous();
        expect(shown()).toMatchObject({
            label: 'Simplified', info: 'Removed facts that say nothing, and conditions that Expected does not depend on.',
            position: '3/4',
        });
        previous();
        expect(shown()).toMatchObject({ label: 'Simplified', position: '2/4' });
        previous();
        expect(shown()).toMatchObject({
            label: 'Original', info: 'What is known here, before simplifying.', position: '1/4',
            lines: ['∀#if_condition #if_condition →', `∀p ${states}`],
        });
    });

    it('says that nothing known proves Expected when the verifier could not prove it, with the steps a step back', () => {
        render(
            derivation([null, chain(['undoManager', 'undoManager == #getUndoManager_result'])]),
            'expected `redoState(undoManager) == redoable` but could not prove it',
        );

        expect(shown()).toMatchObject({ label: 'Summary', info: 'Go back to see what is known here.', position: '2/2', lines: [] });
        expect(document.querySelector('.vc-nothing-known')?.textContent)
            .toBe('Nothing is known here that could prove Expected.');
        previous();
        expect(document.querySelector('.vc-nothing-known')).toBeNull();
        expect(shown()).toMatchObject({
            label: 'Original', position: '1/2', lines: ['∀undoManager undoManager == #getUndoManager_result'],
        });
    });
});
