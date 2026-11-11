import { afterEach, describe, expect, it } from 'vitest';
import type { LJContext, LJGhost } from '../../../types/context';
import { renderContextView } from './context';

const currentFile = 'file:///workspace/Current.java';
const sectionState = { aliases: true, ghosts: true, vars: true };

function ghost(name: string, file = currentFile, stateSet: string | null = null): LJGhost {
    return {
        name, qualifiedName: `Example.${name}`, returnType: stateSet ? 'boolean' : 'int',
        parameterTypes: ['Example'], refinement: '', isState: stateSet !== null, stateSet, file,
    };
}

function context(overrides: Partial<LJContext> = {}): LJContext {
    return {
        localVars: [], globalVars: [], ghosts: [], aliases: [], methods: [],
        visibleVars: [], allVars: [], fileScopes: {}, generatedPlaces: {}, ...overrides,
    };
}

function text(selector: string): string | undefined {
    return document.querySelector(selector)?.textContent?.trim().replace(/\s+/g, ' ');
}

afterEach(() => { document.body.innerHTML = ''; });

describe('context view', () => {
    it('renders aliases, current-file ghosts and states, and variables', () => {
        document.body.innerHTML = renderContextView(context({
            aliases: [{ name: 'Positive', parameters: ['x'], types: ['int'], predicate: 'x > 0' }],
            ghosts: [ghost('size'), ghost('open', currentFile, 'phase'), ghost('other', 'file:///workspace/Other.java')],
            allVars: [{
                name: 'count', displayName: 'count@3', internalName: '#count_1', type: 'int', refinement: 'count@3 > 0',
                mainRefinement: 'count > 0', position: null, annotationPosition: null,
            }],
        }), currentFile, sectionState);

        expect(text('.nav-tab.selected')).toBe('Context');
        expect(Array.from(document.querySelectorAll('.context-toggle-btn span:last-child'), node => node.textContent)).toEqual(['Aliases', 'Ghosts', 'Variables']);
        expect(text('#context-aliases td:first-child')).toBe('Positive(int x) { x > 0 }');
        expect(document.querySelectorAll('#context-ghosts tr')).toHaveLength(2);
        expect(text('#context-ghosts tr:first-child td:first-child')).toBe('int size(Example)');
        expect(text('#context-ghosts tr:first-child td:last-child')).toBe('ghost');
        expect(text('#context-ghosts tr:last-child td:first-child')).toBe('phase(Example) == open');
        expect(text('#context-ghosts tr:last-child td:last-child')).toBe('state');
        expect(text('#context-vars tbody td:first-child')).toBe('countl3');
        expect(text('#context-vars tbody td:last-child')).toBe('countl3 > 0');
        expect(Array.from(document.querySelectorAll('.context-toggle-btn'), node => node.getAttribute('aria-expanded'))).toEqual(['true', 'true', 'true']);
        expect(document.querySelectorAll('.context-section-content.collapsed')).toHaveLength(0);
    });

    it('links the names LiquidJava gives values of the code in refinements to their lines', () => {
        document.body.innerHTML = renderContextView(context({
            allVars: [{
                name: 'a', displayName: 'a', internalName: 'a', type: 'int', refinement: 'a == #pos_result',
                mainRefinement: '', position: null, annotationPosition: null,
            }],
            generatedPlaces: { '#pos_result': { text: 'pos(x)', position: { file: '/w/A.java', lineStart: 6, colStart: 16, lineEnd: 6, colEnd: 22 } } },
        }), currentFile, sectionState);

        const name = document.querySelector('#context-vars .lj-generated-name.location-link');
        expect(name?.getAttribute('title')).toBe(
            'The value returned by the call to pos() at line 7. LiquidJava gives it the name #pos_result. Click to go to it.');
        expect([name?.getAttribute('data-file'), name?.getAttribute('data-line')]).toEqual(['/w/A.java', '6']);
    });

    it('honors each section collapse state independently', () => {
        document.body.innerHTML = renderContextView(context({ ghosts: [ghost('size')] }), currentFile, {
            aliases: false, ghosts: true, vars: false,
        });

        for (const id of ['context-aliases', 'context-vars']) {
            expect(document.querySelector(`#${id}`)?.classList.contains('collapsed')).toBe(true);
            expect(document.querySelector(`[data-context-toggle="${id}"]`)?.getAttribute('aria-expanded')).toBe('false');
        }
        expect(document.querySelector('#context-ghosts')?.classList.contains('collapsed')).toBe(false);
        expect(document.querySelector('[data-context-toggle="context-ghosts"]')?.getAttribute('aria-expanded')).toBe('true');
        expect(text('#context-aliases p')).toBe('No aliases declared in the project');
        expect(text('#context-vars p')).toBe('No variables declared at the cursor position');
    });

    it('shows the empty-ghost message when ghosts belong to another file', () => {
        document.body.innerHTML = renderContextView(context({
            aliases: [{ name: 'Positive', parameters: ['x'], types: ['int'], predicate: 'x > 0' }],
            ghosts: [ghost('other', 'file:///workspace/Other.java')],
        }), currentFile, sectionState);

        expect(text('#context-ghosts p')).toBe('No ghosts or states declared in the current file');
        expect(document.querySelector('.context-ghosts-table')).toBeNull();
    });

    it.each([undefined, context(), context({ ghosts: [ghost('other', 'file:///workspace/Other.java')] })])('shows an empty context state', data => {
        document.body.innerHTML = renderContextView(data, currentFile, sectionState);

        expect(document.body.textContent).toContain('No context information available at the cursor position');
        expect(text('.nav-tab.selected')).toBe('Context');
        expect(document.querySelectorAll('.context-section')).toHaveLength(0);
    });
});
