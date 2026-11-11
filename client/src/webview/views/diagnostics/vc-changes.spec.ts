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
    it('keeps a conjunct per line in a predicate that a simplification changed, marking a repeated conjunct it adds', () => {
        document.body.innerHTML = renderImplicationChange(
            { ...conclusion, predicate: 'x > 0' }, { ...conclusion, predicate: 'x > 0 && x > 0' },
        );

        expect(Array.from(document.querySelectorAll('.lj-line')).map(line => line.textContent)).toEqual(['x > 0 &&', 'x > 0']);
        expect(Array.from(document.querySelectorAll('.vc-change-fragment')).map(fragment => fragment.textContent))
            .toEqual(['x > 0 &&']);
    });
    it('writes a line tag under its variable, saying which value it stands for, and changes it with its variable', () => {
        document.body.innerHTML = renderImplication({
            name: 'x@12', type: 'int', predicate: 'x@12 > failures.size()@84 && y#2 > z@25#2 && s == "x@1"', next: conclusion,
        });

        const tags = Array.from(document.querySelectorAll('sub.lj-line-tag'));
        expect(tags.map(tag => [tag.textContent, tag.getAttribute('title')])).toEqual([
            ['l12', 'x at line 12'], ['l12', 'x at line 12'],
            ['l84', 'failures.size() at line 84'], ['#2', 'the 2nd value of y (line unknown)'],
            ['l25#2', 'the 2nd value z gets at line 25'],
        ]);

        document.body.innerHTML = renderImplicationChange(
            { ...conclusion, predicate: 'x@12 > 0 && s == "x@1"' }, { ...conclusion, predicate: 'x@13 > 0 && s == "x@1"' },
        );
        expect(document.querySelectorAll('sub')).toHaveLength(1);
        expect(Array.from(document.querySelectorAll('.vc-change-fragment')).map(fragment => fragment.innerHTML))
            .toEqual([expect.stringMatching(/^<span [^>]*>x<\/span><sub [^>]*>l13<\/sub>$/)]);
    });
    it('explains the names LiquidJava gives values of the code, linking each to its line when it is known', () => {
        const at = (lineStart: number) => ({ text: '', position: { file: '/w/A.java', lineStart, colStart: 4, lineEnd: lineStart, colEnd: 9 } });
        const table = { '#if_condition': at(9), '#size_result': at(14) };
        const chain: VCImplication = {
            name: '#if_condition', type: 'boolean', predicate: 'x > 0',
            next: { ...conclusion, predicate: 'a == #size_result + #new_File + #case_condition@20#1 + #ret' },
        };
        const names = () => Array.from(document.querySelectorAll('.lj-generated-name'), name =>
            [name.textContent, name.getAttribute('title'), name.getAttribute('data-line')]);

        document.body.innerHTML = renderImplication(chain, table);
        expect(document.querySelector('.vc-binder')?.getAttribute('title')).toBe(
            'The condition of the if at line 10. LiquidJava gives it the name #if_condition. Click to go to it.');
        expect(names()).toEqual([
            ['#size_result', 'The value returned by the call to size() at line 15. LiquidJava gives it the name #size_result. Click to go to it.', '14'],
            ['#new_File', 'The new File object created. LiquidJava gives it the name #new_File.', null],
            ['#case_conditionl20#1', 'Whether the case at line 20 matches. LiquidJava gives it the name #case_condition.', null],
        ]);

        document.body.innerHTML = renderImplicationChange(
            { ...conclusion, predicate: 'a == x + y + z' }, { ...conclusion, predicate: 'a == x + y + #size_result' }, table,
        );
        expect(document.querySelector('.vc-change-fragment .lj-generated-name')?.getAttribute('data-line')).toBe('14');
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
