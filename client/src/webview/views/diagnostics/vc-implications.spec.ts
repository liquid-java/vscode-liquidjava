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
    it('names a simplified step and tells what changed, instead of the pass', () => {
        render(derivation(
            [null, chain(['failures', 'failures == this.failures'], ['n', 'n == size(failures)'])],
            ['Substitution', chain(['n', 'n == size(this.failures)'])],
        ));

        expect(shown()).toEqual({
            label: 'Simplified', info: 'Replaced variables with the values they are equal to.', position: '2/2',
            lines: ['∀n n == size(this.failures)'],
        });
        previous();
        expect(shown()).toMatchObject({ label: 'Original', info: 'What is known here, before simplifying.', position: '1/2' });
    });

    it('shows a display step by name and skips steps with generated names or the same pass', () => {
        const states = 'tiling(p) == tilingNotExplicit && compression(p) == compressionNotExplicit';
        render(derivation(
            [null, chain(['#if_condition', '#if_condition'], ['x', 'x > 0'], ['p', states])],
            ['Binder', chain(['x', 'x > 0'], ['p', states])],
            ['Binder', chain(['p', states])],
            ['Relevant to Expected', chain(['p', 'compression(p) == compressionNotExplicit'])],
        ), 'found compression(p) == compressionNotExplicit but expected ...');

        expect(shown()).toEqual({
            label: 'Relevant to Expected', info: 'Kept only the facts that share a term with Expected.',
            position: '2/2', lines: ['∀p compression(p) == compressionNotExplicit'],
        });
        previous();
        expect(shown()).toMatchObject({
            label: 'Simplified', position: '1/2',
            lines: [`∀p ${states}`],
        });
    });
});
