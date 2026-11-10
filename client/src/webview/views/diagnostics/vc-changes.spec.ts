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
    ] as const)('adds an implication arrow after each nonterminal predicate during %s', (_label, render) => {
        document.body.innerHTML = render();

        const binders = Array.from(document.querySelectorAll('.vc-binder-cell'));
        expect(binders.map(cell => cell.textContent?.trim())).toEqual(['∀x', '∀y']);
        expect(binders.map(cell => cell.querySelector('.vc-binder')?.textContent)).toEqual(['∀x', '∀y']);
        expect(document.querySelector('.vc-line:last-child')?.textContent?.trim()).toBe('x > 0');
        expect(Array.from(document.querySelectorAll('.vc-predicate-cell')).map(cell => cell.textContent?.trim()))
            .toEqual(['x == 1 →', 'y == 2 →', 'x > 0']);
        expect(document.querySelectorAll('.vc-predicate-cell .vc-arrow')).toHaveLength(2);
    });
    it('puts each top-level conjunct and each branch of a conditional on a line of its own', () => {
        document.body.innerHTML = renderImplication({
            name: 'h', type: 'Frame', predicate: 'a > 0 && (b || c) && s == "x && y"',
            next: { ...conclusion, predicate: "p && q ? d(h) == on : (c == ':' ? d(h) == off : d(h) == on)" },
        });

        const lines = (cell: Element) => Array.from(cell.querySelectorAll('.lj-line'))
            .map(line => [line.textContent, line.classList.contains('lj-line-branch')]);
        const [fact, conditional] = document.querySelectorAll('.vc-predicate-cell');
        expect(lines(fact)).toEqual([['a > 0 &&', false], ['(b || c) &&', false], ['s == "x && y" →', false]]);
        expect(lines(conditional)).toEqual([
            ['p && q', false], ['? d(h) == on', true], [": (c == ':' ? d(h) == off : d(h) == on)", true],
        ]);
    });
    it('keeps a conjunct per line in a predicate that a simplification changed', () => {
        document.body.innerHTML = renderImplicationChange(
            { ...conclusion, predicate: 'x > 0 && y > 0' }, { ...conclusion, predicate: 'x > 0 && y == 1' },
        );

        expect(Array.from(document.querySelectorAll('.lj-line')).map(line => line.textContent))
            .toEqual(['x > 0 &&', 'y == 1']);
        expect(document.querySelector('.lj-line:last-child .vc-change-fragment')?.textContent).toBe('==');
    });
    it.each([
        ['initial rendering', () => renderImplication({ ...implication, next: null })],
        ['simplification change', () => renderImplicationChange(implication, { ...implication, next: null })],
    ] as const)('omits the arrow on a terminal node with a binder during %s', (_label, render) => {
        document.body.innerHTML = render();

        expect(document.querySelector('.vc-binder')?.textContent).toBe('∀x');
        expect(document.querySelector('.vc-predicate-cell')?.textContent?.trim()).toBe('x == 1');
        expect(document.querySelector('.vc-arrow')).toBeNull();
    });
});
