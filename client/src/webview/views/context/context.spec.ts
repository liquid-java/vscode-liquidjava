import { afterEach, describe, expect, it } from 'vitest';
import type { LJContext, LJGhost } from '../../../types/context';
import { renderContextView } from './context';

const currentFile = 'file:///workspace/Current.java';
const sectionState = { aliases: true, ghosts: true, vars: true };

function ghost(name: string, file = currentFile, isState = false): LJGhost {
    return {
        name, qualifiedName: `Example.${name}`, returnType: isState ? 'boolean' : 'int',
        parameterTypes: ['Example'], refinement: '', isState, file,
    };
}

function context(overrides: Partial<LJContext> = {}): LJContext {
    return {
        localVars: [], globalVars: [], ghosts: [], aliases: [], methods: [],
        visibleVars: [], allVars: [], fileScopes: {}, ...overrides,
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
            ghosts: [ghost('size'), ghost('open', currentFile, true), ghost('other', 'file:///workspace/Other.java')],
            allVars: [{
                name: 'count', internalName: 'count#1', type: 'int', refinement: 'count > 0',
                mainRefinement: 'count > 0', position: null, annotationPosition: null,
            }],
        }), currentFile, sectionState);

        expect(text('.nav-tab.selected')).toBe('Context');
        expect(Array.from(document.querySelectorAll('.context-toggle-btn span:last-child'), node => node.textContent)).toEqual(['Aliases', 'Ghosts', 'Variables']);
        expect(text('#context-aliases td:first-child')).toBe('Positive(int x) { x > 0 }');
        expect(document.querySelectorAll('#context-ghosts tr')).toHaveLength(2);
        expect(text('#context-ghosts tr:first-child td:first-child')).toBe('int size(Example)');
        expect(text('#context-ghosts tr:first-child td:last-child')).toBe('ghost');
        expect(text('#context-ghosts tr:last-child td:last-child')).toBe('state');
        expect(text('#context-vars tbody td:first-child')).toBe('count');
        expect(text('#context-vars tbody td:last-child')).toBe('count > 0');
        expect(Array.from(document.querySelectorAll('.context-toggle-btn'), node => node.getAttribute('aria-expanded'))).toEqual(['true', 'true', 'true']);
        expect(document.querySelectorAll('.context-section-content.collapsed')).toHaveLength(0);
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
