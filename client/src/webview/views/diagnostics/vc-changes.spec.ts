import { afterEach, describe, expect, it } from 'vitest';
import type { VCImplication } from '../../../types/vc-implications';
import { renderImplication, renderImplicationChange } from './vc-changes';

const conclusion: VCImplication = { name: null, type: null, predicate: 'x > 0', next: null };
const implication: VCImplication = {
    name: 'x', type: 'int', predicate: 'x == 1',
    next: { name: 'y', type: 'int', predicate: 'y == 2', next: conclusion },
};

afterEach(() => { document.body.innerHTML = ''; });

describe('verification implications', () => {
    it.each([
        ['initial rendering', () => renderImplication(implication)],
        ['simplification change', () => renderImplicationChange(
            { ...implication, predicate: 'x > 0' }, implication,
        )],
    ] as const)('adds an implication arrow after each binder during %s', (_label, render) => {
        document.body.innerHTML = render();

        const binders = Array.from(document.querySelectorAll('.vc-binder-cell'));
        expect(binders.map(cell => cell.textContent?.trim())).toEqual(['∀x ->', '∀y ->']);
        expect(binders.map(cell => cell.querySelector('.vc-binder')?.textContent)).toEqual(['∀x', '∀y']);
        expect(document.querySelector('.vc-line:last-child')?.textContent?.trim()).toBe('x > 0');
        expect(document.querySelectorAll('.vc-predicate-cell')).toHaveLength(3);
    });
});
