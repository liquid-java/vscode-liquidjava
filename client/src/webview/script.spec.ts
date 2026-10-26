import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { LJContext, LJVariable } from '../types/context';
import type { LJDiagnostic, SourcePosition } from '../types/diagnostics';
import type { LJStateMachine } from '../types/fsm';

const currentFile = '/workspace/src/Main.java';
const otherFile = '/workspace/src/Other.java';
const position: SourcePosition = {
    file: currentFile,
    lineStart: 4,
    colStart: 8,
    lineEnd: 4,
    colEnd: 13,
};

function diagnostic(file: string, title: string, category: 'error' | 'warning' = 'error'): LJDiagnostic {
    const details = {
        title,
        message: `${title} message`,
        hint: null,
        file,
        position: { ...position, file },
    };
    return category === 'error'
        ? { ...details, category, type: 'custom-error' }
        : { ...details, category, type: 'custom-warning' };
}

function context(file = currentFile): LJContext {
    const variable: LJVariable = {
        name: 'count',
        internalName: 'count_1',
        type: 'int',
        refinement: 'count > 0',
        mainRefinement: 'count > 0',
        position: { ...position, file },
        annotationPosition: null,
    };
    return {
        localVars: [variable],
        globalVars: [],
        ghosts: [],
        aliases: [],
        methods: [],
        visibleVars: [variable],
        allVars: [variable],
        fileScopes: {},
    };
}

const stateMachine: LJStateMachine = {
    className: 'Counter',
    initialTransitions: [{ to: 'Open' }],
    states: ['Open', 'Closed'],
    transitions: [{ from: 'Open', to: 'Closed', label: 'close()' }],
    errorContext: null,
};

function stateError(title: string, sm: LJStateMachine, line = position.lineStart, file = currentFile): LJDiagnostic {
    const errorPosition = { ...position, file, lineStart: line, lineEnd: line };
    return {
        title, message: `${title} message`, hint: null, file, position: errorPosition,
        category: 'error', type: 'state-refinement-error', translationTable: {}, expected: 'Open(counter)',
        found: { implication: null as never, origin: null, simplification: 'Closed(counter)' },
        customMessage: '', declarationPosition: null, stateMachine: sm,
    };
}

function errorMachine(className: string, calledMethod: string): LJStateMachine {
    return {
        ...stateMachine,
        className,
        states: [...stateMachine.states, 'Broken'],
        transitions: [...stateMachine.transitions, { from: 'Broken', to: 'Broken', label: 'reopen()' }],
        initialTransitions: [{ to: 'Open' }, { to: 'Broken' }],
        errorContext: {
            calledMethod, receiver: 'counter', possibleStates: ['Closed'], acceptedStates: ['Open'],
            validStates: [], invalidStates: ['Closed'],
        },
    };
}

describe('webview script', () => {
    let dom: JSDOM;
    let root: HTMLElement;
    let postMessage: Mock<(message: unknown) => void>;
    let runMermaid: Mock<(options: { nodes: NodeListOf<Element> }) => Promise<void>>;

    beforeEach(async () => {
        // fresh modules and DOM isolate diagram state and event listeners
        vi.resetModules();
        dom = new JSDOM('<div id="root"></div>');
        vi.stubGlobal('window', dom.window);
        vi.stubGlobal('document', dom.window.document);
        vi.stubGlobal('Element', dom.window.Element);
        vi.stubGlobal('HTMLElement', dom.window.HTMLElement);
        Object.defineProperty(dom.window.HTMLElement.prototype, 'scrollIntoView', { value: vi.fn() });
        runMermaid = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(dom.window, 'mermaid', { value: { run: runMermaid } });
        postMessage = vi.fn();
        root = dom.window.document.getElementById('root')!;
        const { getScript } = await import('./script');
        getScript({ postMessage }, dom.window.document, dom.window as unknown as Window);
    });

    afterEach(() => {
        dom.window.close();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    function receive(data: unknown) {
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data }));
    }

    function click(selector: string): HTMLElement {
        const element = root.querySelector<HTMLElement>(selector);
        expect(element, `missing clickable element: ${selector}`).not.toBeNull();
        element!.click();
        return element!;
    }

    function showDiagnostics(diagnostics: LJDiagnostic[]) {
        receive({ type: 'file', file: currentFile });
        receive({ type: 'diagnostics', diagnostics });
        receive({ type: 'status', status: diagnostics.some(d => d.category === 'error') ? 'failed' : 'passed' });
    }

    it('puts the State Machine tab next to Verification, which link to each other', () => {
        showDiagnostics([]);

        expect(Array.from(root.querySelectorAll('.nav-tab'), tab => tab.getAttribute('data-tab'))).toEqual(['diagnostics', 'fsm', 'context']);
    });

    it('posts ready and renders the initial loading view', () => {
        expect(postMessage.mock.calls).toEqual([[{ type: 'ready' }]]);
        expect(root.querySelector('h2')?.textContent).toBe('Verification Pending');
        expect(root.querySelector('.info')?.textContent).toContain('Running the LiquidJava verification');
    });

    it('switches between diagnostics, context, and state machine tabs', async () => {
        showDiagnostics([diagnostic(currentFile, 'Current error')]);
        receive({ type: 'context', context: context() });
        receive({ type: 'fsm', sm: stateMachine });
        postMessage.mockClear();

        click('[data-tab="context"]');
        expect(root.querySelector('.nav-tab.selected')?.getAttribute('data-tab')).toBe('context');
        expect(root.querySelector('#context-vars')?.textContent).toContain('count');
        expect(root.querySelector('.diagnostic-item')).toBeNull();

        click('[data-tab="fsm"]');
        expect(root.querySelector('.nav-tab.selected')?.getAttribute('data-tab')).toBe('fsm');
        expect(root.querySelector('.diagram-title')?.textContent).toBe('Counter');
        expect(root.querySelector('.mermaid')?.textContent).toContain('Open --> Closed : close()');
        expect(runMermaid).toHaveBeenCalledOnce();
        expect(runMermaid.mock.calls[0][0].nodes[0]).toBe(root.querySelector('.mermaid'));
        await vi.waitFor(() => {
            expect(root.querySelector<HTMLElement>('#diagram-wrapper')?.style.transform).toBe('matrix(1, 0, 0, 1, 0, 0)');
        });

        click('[data-tab="diagnostics"]');
        expect(root.querySelector('.nav-tab.selected')?.getAttribute('data-tab')).toBe('diagnostics');
        expect(root.querySelector('.diagnostic-item h3')?.textContent).toBe('Current error');
        expect(root.querySelector('.diagram-container')).toBeNull();
        expect(postMessage.mock.calls).toEqual([
            [{ type: 'highlight', range: null }],
            [{ type: 'highlight', range: null }],
            [{ type: 'highlight', range: null }],
        ]);
    });

    it('opens a state error focused on the error and toggles the dimming', () => {
        const error = stateError('State refinement error', errorMachine('Counter', 'close'));
        showDiagnostics([error]);

        click('.diagnostic-state-machine-btn');
        expect(root.querySelector('.nav-tab.selected')?.getAttribute('data-tab')).toBe('fsm');
        expect(root.querySelector('#diagram-focus-btn')?.textContent?.trim()).toBe('Show all');
        expect(root.querySelector('.mermaid')?.textContent).toContain('class Broken ljStateDimmed');

        // the full diagram stays visible, only the dimming is toggled
        click('#diagram-focus-btn');
        expect(root.querySelector('#diagram-focus-btn')?.textContent?.trim()).toBe('Focus on error');
        expect(root.querySelector('.mermaid')?.textContent).toContain('Broken --> Broken : reopen()');
        expect(root.querySelector('.mermaid')?.textContent).not.toMatch(/ljStateDimmed|lj-dimmed/);
        expect(root.querySelector('.mermaid .lj-dimmed-method')).toBeNull();

        click('#diagram-focus-btn');
        expect(root.querySelector('#diagram-focus-btn')?.textContent?.trim()).toBe('Show all');
        expect(root.querySelector('.mermaid')?.textContent).toContain('class Broken ljStateDimmed');
        expect(Array.from(root.querySelectorAll('.mermaid .lj-dimmed-method'), node => node.textContent)).toEqual(['close()', 'reopen()']);

        // the tab keeps the error after visiting another tab
        click('[data-tab="diagnostics"]');
        receive({ type: 'fsm', sm: stateMachine });
        click('[data-tab="fsm"]');
        expect(root.querySelector('#diagram-focus-btn')?.textContent?.trim()).toBe('Show all');
        expect(root.querySelector('.mermaid')?.textContent).toContain('class Broken ljStateDimmed');
    });

    it('keeps the zoom when toggling the dimming and resets it for a new error', async () => {
        showDiagnostics([stateError('State refinement error', errorMachine('Counter', 'close'))]);
        click('.diagnostic-state-machine-btn');
        const transform = () => root.querySelector<HTMLElement>('#diagram-wrapper')?.style.transform;
        await vi.waitFor(() => expect(transform()).toBe('matrix(1, 0, 0, 1, 0, 0)'));

        click('#zoom-in-btn');
        click('#diagram-focus-btn');
        await vi.waitFor(() => expect(runMermaid).toHaveBeenCalledTimes(2));
        await vi.waitFor(() => expect(transform()).toBe('matrix(1.5, 0, 0, 1.5, 0, 0)'));

        click('[data-tab="diagnostics"]');
        click('.diagnostic-state-machine-btn');
        await vi.waitFor(() => expect(transform()).toBe('matrix(1, 0, 0, 1, 0, 0)'));
    });

    it('copies the Mermaid source without the error overlay', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        vi.stubGlobal('navigator', { clipboard: { writeText } });
        showDiagnostics([]);
        receive({ type: 'fsm', sm: { ...errorMachine('Counter', 'close'), errorContext: null } });
        click('[data-tab="fsm"]');
        click('#copy-diagram-btn');
        const plain = writeText.mock.calls[0][0];

        click('[data-tab="diagnostics"]');
        showDiagnostics([stateError('State refinement error', errorMachine('Counter', 'close'))]);
        click('.diagnostic-state-machine-btn');
        await vi.waitFor(() => expect(root.querySelector<HTMLButtonElement>('#copy-diagram-btn')?.disabled).toBe(false));
        click('#copy-diagram-btn');

        expect(root.querySelector('.mermaid')?.textContent).toContain('ljStateDimmed');
        expect(writeText.mock.calls[1][0]).toBe(plain);
        expect(plain).not.toMatch(/ljState|lj-dimmed|lj-state-error-method/);
    });

    it('opens another state error focused after showing the full diagram of the previous one', () => {
        showDiagnostics([
            stateError('First state error', errorMachine('First', 'close'), 4),
            stateError('Second state error', errorMachine('Second', 'reset'), 9),
        ]);

        click('.diagnostic-state-machine-btn[data-error-index="0"]');
        click('#diagram-focus-btn');
        expect(root.querySelector('#diagram-focus-btn')?.textContent?.trim()).toBe('Focus on error');

        click('[data-tab="diagnostics"]');
        click('.diagnostic-state-machine-btn[data-error-index="1"]');
        expect(root.querySelector('.diagram-title')?.textContent).toBe('Second');
        expect(root.querySelector('#diagram-focus-btn')?.textContent?.trim()).toBe('Show all');
        expect(root.querySelector('.diagram-error-text')?.textContent).toContain('counter.reset()');
        expect(root.querySelector('.mermaid')?.textContent).toContain('class Broken ljStateDimmed');
    });

    it('keeps the error summary selectable while the diagram pans', async () => {
        showDiagnostics([stateError('State refinement error', errorMachine('Counter', 'close'))]);
        click('.diagnostic-state-machine-btn');
        await vi.waitFor(() => {
            expect(root.querySelector<HTMLElement>('#diagram-wrapper')?.style.transform).toBe('matrix(1, 0, 0, 1, 0, 0)');
        });

        const mouseDown = (selector: string) => {
            const event = new dom.window.MouseEvent('mousedown', { bubbles: true, cancelable: true });
            root.querySelector(selector)!.dispatchEvent(event);
            return event.defaultPrevented;
        };
        expect(mouseDown('.diagram-error-text code')).toBe(false);
        expect(mouseDown('#diagram-wrapper')).toBe(true);
    });

    it('steps through the state errors of the file in source order', () => {
        showDiagnostics([
            stateError('Second state error', errorMachine('Second', 'reset'), 9),
            stateError('First state error', errorMachine('First', 'close'), 4),
        ]);
        expect(root.querySelector('[data-tab="fsm"] .nav-badge')?.textContent).toBe('2');

        click('.diagnostic-state-machine-btn[data-error-index="1"]');
        expect(root.querySelector('.diagram-title')?.textContent).toBe('First');
        expect(root.querySelector('.state-error-position')?.textContent).toBe('1 of 2');

        click('.state-error-step-btn[data-step="1"]');
        expect(root.querySelector('.diagram-title')?.textContent).toBe('Second');
        expect(root.querySelector('.state-error-position')?.textContent).toBe('2 of 2');
        expect(root.querySelector('.diagram-error-text')?.textContent).toContain('counter.reset()');
        expect(root.querySelector<HTMLButtonElement>('.state-error-step-btn[data-step="1"]')?.disabled).toBe(true);

        click('.state-error-step-btn[data-step="-1"]');
        expect(root.querySelector('.diagram-title')?.textContent).toBe('First');
    });

    it('opens on the first state error of the file, focused', () => {
        showDiagnostics([
            stateError('Second state error', errorMachine('Second', 'reset'), 9),
            stateError('First state error', errorMachine('First', 'close'), 4),
        ]);
        receive({ type: 'fsm', sm: stateMachine });
        click('[data-tab="fsm"]');

        expect(root.querySelector('.diagram-title')?.textContent).toBe('First');
        expect(root.querySelector('.state-error-position')?.textContent).toBe('1 of 2');
        expect(root.querySelector('#diagram-focus-btn')?.textContent?.trim()).toBe('Show all');
        expect(root.querySelector('.mermaid')?.textContent).toContain('ljStateDimmed');
    });

    it('counts only the state errors of the current file, as listed in the Verification tab', () => {
        showDiagnostics([
            stateError('State refinement error', errorMachine('Counter', 'close'), 4),
            stateError('Other file error', errorMachine('Counter', 'close'), 2, otherFile),
        ]);

        expect(root.querySelector('[data-tab="fsm"] .nav-badge')?.textContent).toBe('1');
        expect(root.querySelectorAll('.diagnostic-state-machine-btn')).toHaveLength(1);
    });

    it('follows the state error at the cursor without overriding a later choice', () => {
        const first = stateError('First state error', errorMachine('First', 'close'), 4);
        const second = stateError('Second state error', errorMachine('Second', 'reset'), 9);
        showDiagnostics([first, second]);

        // the error reached by the cursor is shown when the tab opens
        receive({ type: 'context', context: context(), errorAtCursor: second });
        expect(root.querySelector('.nav-tab.selected')?.getAttribute('data-tab')).toBe('diagnostics');
        click('[data-tab="fsm"]');
        expect(root.querySelector('.diagram-title')?.textContent).toBe('Second');

        receive({ type: 'context', context: context(), errorAtCursor: first });
        expect(root.querySelector('.diagram-title')?.textContent).toBe('First');

        // the same error at the cursor after a new verification keeps the error chosen in the view
        click('.state-error-step-btn[data-step="1"]');
        receive({ type: 'context', context: context(), errorAtCursor: { ...first } });
        expect(root.querySelector('.diagram-title')?.textContent).toBe('Second');

        // moving away and back to an error shows it again
        receive({ type: 'context', context: context(), errorAtCursor: undefined });
        expect(root.querySelector('.diagram-title')?.textContent).toBe('Second');
        receive({ type: 'context', context: context(), errorAtCursor: first });
        expect(root.querySelector('.diagram-title')?.textContent).toBe('First');
    });

    it('goes back to the shown state error in the Verification tab', () => {
        // the other error is at another position, so only the state error is revealed
        const error = stateError('State refinement error', errorMachine('Counter', 'close'), 7);
        showDiagnostics([diagnostic(currentFile, 'Other error'), error]);
        click('.diagnostic-state-machine-btn');

        click('#state-error-reveal-btn');
        expect(root.querySelector('.nav-tab.selected')?.getAttribute('data-tab')).toBe('diagnostics');
        expect(root.querySelector('.diagnostic-item.revealed h3')?.textContent).toBe('State refinement error');
    });

    it('opens a state error on the state machine from the editor', () => {
        const error = stateError('State refinement error', errorMachine('Counter', 'close'), 7);
        showDiagnostics([error]);

        receive({ type: 'revealDiagnostic', diagnostic: { file: currentFile, position: error.position }, tab: 'fsm' });
        expect(root.querySelector('.nav-tab.selected')?.getAttribute('data-tab')).toBe('fsm');
        expect(root.querySelector('#diagram-focus-btn')?.textContent?.trim()).toBe('Show all');

        // other diagnostics are still revealed in the Verification tab
        receive({ type: 'revealDiagnostic', diagnostic: { file: currentFile, position: { ...position, lineStart: 1 } }, tab: 'fsm' });
        expect(root.querySelector('.nav-tab.selected')?.getAttribute('data-tab')).toBe('diagnostics');
    });

    it('keeps the rendered diagram when a new verification does not change it', async () => {
        const error = stateError('State refinement error', errorMachine('Counter', 'close'));
        showDiagnostics([error]);
        click('.diagnostic-state-machine-btn');
        const rendered = root.querySelector('.diagram-container');

        receive({ type: 'diagnostics', diagnostics: [{ ...error }] });
        expect(root.querySelector('.diagram-container')).toBe(rendered);
        expect(runMermaid).toHaveBeenCalledOnce();

        // fixing the error clears it from the view
        receive({ type: 'diagnostics', diagnostics: [] });
        expect(root.querySelector('#diagram-focus-btn')).toBeNull();
        expect(root.querySelector('.nav-badge')).toBeNull();
    });

    it('labels the state machine action of state errors', () => {
        showDiagnostics([stateError('State refinement error', errorMachine('Counter', 'close'))]);

        expect(root.querySelector('.diagnostic-state-machine-btn')?.textContent?.trim()).toBe('Show in state machine');
        expect(root.querySelector('.diagnostic-actions .diagnostic-state-machine-btn')).toBeNull();
        // right below the error message, before its details
        const firstSection = root.querySelector('.error-item .section')!;
        expect(root.querySelector('.diagnostic-state-machine-btn')!.compareDocumentPosition(firstSection)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('opens on the first state error of a newly opened file', () => {
        showDiagnostics([
            stateError('Main error', errorMachine('Main', 'close'), 4),
            stateError('Other file error', errorMachine('Other', 'close'), 2, otherFile),
        ]);
        click('.diagnostic-state-machine-btn');
        expect(root.querySelector('.diagram-title')?.textContent).toBe('Main');

        receive({ type: 'file', file: otherFile });
        expect(root.querySelector('.diagram-title')?.textContent).toBe('Other');
    });

    it('toggles between file and workspace errors by clicking scope buttons', () => {
        showDiagnostics([
            diagnostic(currentFile, 'Current error'),
            diagnostic(otherFile, 'Other error'),
        ]);
        expect(root.querySelectorAll('.diagnostic-item')).toHaveLength(1);
        expect(root.querySelector('.diagnostics-scope-button.selected')?.getAttribute('data-diagnostics-scope')).toBe('file');

        // clicking a child still activates the scope button
        click('[data-diagnostics-scope="workspace"] .diagnostics-scope-count');
        expect(root.querySelectorAll('.diagnostic-item')).toHaveLength(2);
        expect(root.textContent).toContain('Other error');
        expect(root.querySelector('.diagnostics-scope-button.selected')?.getAttribute('data-diagnostics-scope')).toBe('workspace');

        click('[data-diagnostics-scope="file"]');
        expect(root.querySelectorAll('.diagnostic-item')).toHaveLength(1);
        expect(root.textContent).not.toContain('Other error');
    });

    it('toggles show-all diagnostics when only warnings are present', () => {
        showDiagnostics([
            diagnostic(currentFile, 'Current warning', 'warning'),
            diagnostic(otherFile, 'Other warning', 'warning'),
        ]);
        expect(root.querySelectorAll('.diagnostic-item')).toHaveLength(1);
        expect(root.querySelector('#show-all-button')?.textContent?.trim()).toBe('Show all diagnostics');

        click('#show-all-button');
        expect(root.querySelectorAll('.diagnostic-item')).toHaveLength(2);
        expect(root.textContent).toContain('Other warning');
        expect(root.querySelector('#show-all-button')?.textContent?.trim()).toBe('Show file diagnostics');

        click('#show-all-button');
        expect(root.querySelectorAll('.diagnostic-item')).toHaveLength(1);
        expect(root.textContent).not.toContain('Other warning');
    });

    it('posts the file and zero-based position when a diagnostic location is clicked', () => {
        showDiagnostics([diagnostic(currentFile, 'Current error')]);
        postMessage.mockClear();

        click('.location-link');
        expect(postMessage.mock.calls).toEqual([[{
            type: 'openFile',
            filePath: currentFile,
            line: position.lineStart,
            character: position.colStart,
        }]]);
    });

    it('highlights a current-file variable and clears the highlight on a second click', () => {
        showDiagnostics([]);
        receive({ type: 'context', context: context() });
        click('[data-tab="context"]');
        postMessage.mockClear();
        const { file: _file, ...range } = position;

        const button = click('.highlight-var-btn code');
        expect(button.closest('.highlight-var-btn')?.classList.contains('selected')).toBe(true);
        expect(postMessage.mock.calls).toEqual([[{ type: 'highlight', range }]]);

        click('.highlight-var-btn');
        expect(root.querySelector('.highlight-var-btn.selected')).toBeNull();
        expect(postMessage.mock.calls).toEqual([
            [{ type: 'highlight', range }],
            [{ type: 'highlight', range: null }],
        ]);
    });

    it('opens another file with the variable range when its highlight button is clicked', () => {
        showDiagnostics([]);
        receive({ type: 'context', context: context(otherFile) });
        click('[data-tab="context"]');
        postMessage.mockClear();
        const { file: _file, ...range } = position;

        click('.highlight-var-btn');
        expect(postMessage.mock.calls).toEqual([[{
            type: 'openFile',
            filePath: otherFile,
            line: position.lineStart,
            character: position.colStart,
            highlightRange: range,
        }]]);
    });
});
