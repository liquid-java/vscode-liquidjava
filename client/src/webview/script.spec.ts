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

    it('logs tab and section interactions only while study logging is enabled', () => {
        showDiagnostics([diagnostic(currentFile, 'Error')]);
        receive({ type: 'context', context: context() });
        click('[data-tab="context"]');
        expect(postMessage.mock.calls.some(([message]) => (message as any).type === 'log')).toBe(false);

        receive({ type: 'study', enabled: true });
        postMessage.mockClear();
        click('[data-context-toggle="context-vars"]');
        click('[data-tab="diagnostics"]');
        expect(postMessage.mock.calls).toContainEqual([{ type: 'log', event: 'section_toggled', section: 'context-vars', expanded: false }]);
        expect(postMessage.mock.calls).toContainEqual([{ type: 'log', event: 'tab_selected', tab: 'diagnostics' }]);

        receive({ type: 'study', enabled: false });
        postMessage.mockClear();
        click('[data-tab="context"]');
        expect(postMessage.mock.calls.some(([message]) => (message as any).type === 'log')).toBe(false);
    });

    it('records successful clipboard copies without the copied diagnostic content', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        vi.stubGlobal('navigator', { clipboard: { writeText } });
        showDiagnostics([diagnostic(currentFile, 'Private diagnostic text')]);
        receive({ type: 'study', enabled: true });
        postMessage.mockClear();
        click('.copy-diagnostic-btn');
        await vi.waitFor(() => expect(postMessage.mock.calls).toContainEqual([{ type: 'log', event: 'clipboard_copy', target: 'diagnostic' }]));
        expect(writeText).toHaveBeenCalledOnce();
        expect(JSON.stringify(postMessage.mock.calls)).not.toContain('Private diagnostic text');
    });

    it('deduplicates continuously visible sections across diagnostic redraws', () => {
        const error = { ...diagnostic(currentFile, 'Error'), hint: 'Private hint' };
        showDiagnostics([error]);
        receive({ type: 'study', enabled: true });
        postMessage.mockClear();
        receive({ type: 'diagnostics', diagnostics: [error] });
        expect(postMessage.mock.calls.some(([message]) => (message as any).event === 'section_shown')).toBe(false);
        receive({ type: 'context', context: context() });
        click('[data-tab="context"]');
        click('[data-tab="diagnostics"]');
        expect(postMessage.mock.calls).toContainEqual([{ type: 'log', event: 'section_shown', section: 'hint' }]);
        expect(JSON.stringify(postMessage.mock.calls)).not.toContain('Private hint');
    });
});
