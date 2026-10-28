import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LJStateMachine, LJStateMachineErrorContext } from '../types/fsm';
import { createMermaidDiagram, renderMermaidDiagram } from './diagram';
import { getRelatedStates, getStateErrorFocus, getStateErrorFocuses, orderStateMachines } from './diagram-focus';

// DefaultMutableTreeNode from the state error focus issue:
// root.add(...); root.removeAllChildren(); root.getFirstChild(); // state error
function treeNode(errorContext: Partial<LJStateMachineErrorContext> | null = {}): LJStateMachine {
    return {
        className: 'DefaultMutableTreeNode',
        states: ['childrenAllowed', 'maybeHasChildren'],
        initialTransitions: [{ to: 'childrenAllowed', constructorSignature: 'DefaultMutableTreeNode(Object)' }],
        transitions: [
            { from: 'childrenAllowed', to: 'maybeHasChildren', label: 'add' },
            { from: 'maybeHasChildren', to: 'childrenAllowed', label: 'removeAllChildren' },
            { from: 'maybeHasChildren', to: 'maybeHasChildren', label: 'getFirstChild' },
        ],
        errorContext: errorContext && {
            calledMethod: 'getFirstChild',
            receiver: 'root',
            possibleStates: ['childrenAllowed'],
            acceptedStates: ['maybeHasChildren'],
            validStates: [],
            invalidStates: ['childrenAllowed'],
            ...errorContext,
        },
    };
}

// java.net.DatagramSocket from the UDP chat client study example: socket.close() on one branch,
// then socket.receive(...), with an extra state unrelated to the error
function datagramSocket(errorContext: Partial<LJStateMachineErrorContext> = {}): LJStateMachine {
    const open = ['unbound', 'bound', 'connected'];
    return {
        className: 'java.net.DatagramSocket',
        states: ['unbound', 'bound', 'connected', 'closed', 'broken'],
        initialTransitions: [{ to: 'bound', constructorSignature: 'new DatagramSocket()' }, { to: 'broken' }],
        transitions: [
            { from: 'unbound', to: 'bound', label: 'bind' },
            { from: 'bound', to: 'connected', label: 'connect' },
            { from: 'connected', to: 'bound', label: 'disconnect' },
            ...open.map(state => ({ from: state, to: state, label: 'receive' })),
            ...open.map(state => ({ from: state, to: state, label: 'send' })),
            ...open.map(state => ({ from: state, to: 'closed', label: 'close' })),
            { from: 'broken', to: 'broken', label: 'repair' },
            { from: 'broken', to: 'closed', label: 'discard' },
        ],
        errorContext: {
            calledMethod: 'receive',
            receiver: 'socket',
            possibleStates: ['bound', 'closed'],
            acceptedStates: open,
            validStates: ['bound'],
            invalidStates: ['closed'],
            ...errorContext,
        },
    };
}

function lines(diagram: string): string[] {
    return diagram.split('\n').map(line => line.trim());
}

const dimmedTransitions = (diagram: string) => lines(diagram).filter(line => line.startsWith('%% lj-dimmed-transitions:'));
const calledMethod = (label: string) => `<span class="lj-state-error-method">${label}</span>`;
const dimmedMethod = (label: string) => `<span class="lj-dimmed-method">${label}</span>`;
const collapsedMethods = (labels: string[], count: string) =>
    `<span class="lj-dimmed-method lj-collapsed-methods">${count}<span class="lj-collapsed-list">${labels.map(label => `<span class="lj-collapsed-item">${label}</span>`).join('')}</span></span>`;

describe('state error focus', () => {
    it('splits the possible states into valid and invalid ones', () => {
        expect(getStateErrorFocus(datagramSocket())).toEqual({
            calledMethod: 'receive',
            receiver: 'socket',
            possibleStates: ['bound', 'closed'],
            validStates: ['bound'],
            invalidStates: ['closed'],
            acceptedStates: ['unbound', 'bound', 'connected'],
            unknownState: false,
        });
        expect(getRelatedStates(getStateErrorFocus(datagramSocket())!)).toEqual(['bound', 'closed', 'unbound', 'connected']);
    });

    it('marks valid and invalid states and colours every edge of the called method', () => {
        for (const focusOnError of [true, false]) {
            const diagram = lines(createMermaidDiagram(datagramSocket(), 'TB', false, focusOnError));

            expect(diagram).toEqual(expect.arrayContaining([
                'state "✓ bound" as bound',
                'state "✕ closed" as closed',
                'class bound ljStateValid',
                'class closed ljStateInvalid',
            ]));
            const send = focusOnError ? dimmedMethod('send') : 'send';
            // a single dimmed method keeps its name
            for (const state of ['unbound', 'bound', 'connected']) {
                expect(diagram).toContain(`${state} --> ${state} : ${calledMethod('receive')}<br/>${send}`);
            }
            // accepted states that are not possible get only a class, without a mark in their name
            expect(diagram.filter(line => /^(state|class) .*\b(unbound|connected)\b/.test(line)))
                .toEqual(['class unbound,connected ljStateAccepted']);
            expect(diagram.join('\n')).not.toContain('ljStateErrorActual');
        }
    });

    it('dims the states unrelated to the error and the transitions without the failed method when focused', () => {
        const focused = createMermaidDiagram(datagramSocket(), 'TB', false, true);

        expect(lines(focused)).toContain('class broken ljStateDimmed');
        // both constructors, then bind, connect, disconnect, every close, repair, and discard
        expect(dimmedTransitions(focused)).toEqual(['%% lj-dimmed-transitions: edge0 edge1 edge2 edge3 edge4 edge8 edge9 edge10 edge11 edge12']);
        expect(focused).not.toContain('lj-fix');
    });

    it('draws entry transitions from the initial pseudo state, dimmed when focused', () => {
        // a getter that puts a tree node in an unknown state into maybeHasChildren when it returns false
        const sm = { ...treeNode(), entryTransitions: [{ to: 'maybeHasChildren', label: 'isLeaf', toCondition: '!return' }] };

        expect(lines(createMermaidDiagram(sm, 'TB', false, false))).toContain('[*] --> maybeHasChildren : isLeaf');
        expect(lines(createMermaidDiagram(sm, 'TB', true, false))).toContain(
            '[*] --> maybeHasChildren : isLeaf<br/><span class="state-cond state-cond-post">!return</span>');
        // the constructor and the entry transition come first
        expect(dimmedTransitions(createMermaidDiagram(sm, 'TB', false, true))[0]).toMatch(/^%% lj-dimmed-transitions: edge0 edge1\b/);
    });

    it('merges the entry transitions of each state into one collapsed transition when focused', () => {
        const sm = { ...treeNode(), entryTransitions: [
            { to: 'maybeHasChildren', label: 'isLeaf', toCondition: '!return' },
            { to: 'maybeHasChildren', label: 'getChildCount', toCondition: 'return > 0' },
        ] };

        expect(lines(createMermaidDiagram(sm, 'TB', true, true))).toContain(`[*] --> maybeHasChildren : ${collapsedMethods([
            'isLeaf<br/><span class="state-cond state-cond-post">!return</span>',
            'getChildCount<br/><span class="state-cond state-cond-post">return &gt; 0</span>',
        ], '2 methods')}`);
    });

    it('leaves the full diagram unchanged when showing all', () => {
        const full = createMermaidDiagram(datagramSocket(), 'TB', false, false);

        expect(full).not.toMatch(/ljStateDimmed|lj-dimmed|lj-fix|lj-collapsed/);
        expect(lines(full)).toEqual(expect.arrayContaining([
            '[*] --> bound : new DatagramSocket()',
            '[*] --> broken',
            'bound --> connected : connect',
        ]));
    });

    it('collapses the dimmed methods of a label into a count, keeping them for the list on hover', () => {
        const sm = datagramSocket();
        sm.transitions.push(
            { from: 'bound', to: 'bound', label: 'getPort' },
            { from: 'bound', to: 'bound', label: 'getOption' },
            { from: 'unbound', to: 'bound', label: 'bindAll' },
            // an overload is counted once
            { from: 'unbound', to: 'bound', label: 'bind' },
        );

        expect(lines(createMermaidDiagram(sm, 'TB', false, true))).toEqual(expect.arrayContaining([
            `bound --> bound : ${calledMethod('receive')}<br/>${collapsedMethods(['send', 'getPort', 'getOption'], '+3 more')}`,
            `unbound --> bound : ${collapsedMethods(['bind', 'bindAll'], '2 methods')}`,
        ]));
    });

    it('merges the constructors of each state into one collapsed transition when focused', () => {
        const sm = treeNode();
        sm.initialTransitions.push({ to: 'childrenAllowed', constructorSignature: 'DefaultMutableTreeNode()' });

        const diagram = lines(createMermaidDiagram(sm, 'TB', false, true));
        expect(diagram).toContain(`[*] --> childrenAllowed : ${collapsedMethods(['DefaultMutableTreeNode(Object)', 'DefaultMutableTreeNode()'], '2 constructors')}`);
        expect(diagram.filter(line => line.startsWith('[*]'))).toHaveLength(1);
    });

    it('dims the conditions of a dimmed method with it', () => {
        const sm = datagramSocket();
        sm.transitions[0] = { ...sm.transitions[0], fromCondition: 'unbound(this)' };

        expect(lines(createMermaidDiagram(sm, 'TB', true, true))).toContain(
            `unbound --> bound : ${dimmedMethod('<span class="state-cond state-cond-pre">unbound(this)</span><br/>bind')}`);
    });

    it('only colours labels that match the called method exactly', () => {
        const sm = datagramSocket();
        sm.transitions.push({ from: 'bound', to: 'bound', label: 'receiveAll' });

        expect(lines(createMermaidDiagram(sm, 'TB', false, true)))
            .toContain(`bound --> bound : ${calledMethod('receive')}<br/>${collapsedMethods(['send', 'receiveAll'], '+2 more')}`);
    });

    it('does not focus without accepted states', () => {
        const sm = datagramSocket({ acceptedStates: [], validStates: [], invalidStates: [] });

        expect(getStateErrorFocus(sm)).toBeNull();
        const diagram = createMermaidDiagram(sm, 'TB', false, true);
        expect(diagram).not.toMatch(/ljStateDimmed|lj-dimmed-transitions|ljStateValid|ljStateInvalid/);
        expect(diagram).toContain('class bound,closed ljStateErrorActual');
    });

    it('only hints at the accepted states when the state of the receiver is unknown', () => {
        const sm = datagramSocket({
            possibleStates: ['unbound', 'bound', 'connected', 'closed', 'broken'],
            validStates: ['unbound', 'bound', 'connected'],
            invalidStates: ['closed', 'broken'],
        });

        const focus = getStateErrorFocus(sm);
        expect(focus).toMatchObject({ unknownState: true, validStates: [], invalidStates: [] });
        const diagram = createMermaidDiagram(sm, 'TB', false, true);
        expect(lines(diagram)).toContain('class unbound,bound,connected ljStateAccepted');
        expect(diagram).not.toMatch(/ljStateValid|ljStateInvalid|ljStateDimmed|" as /);
        // only the failed method stays bright
        expect(lines(diagram)).toEqual(expect.arrayContaining([`unbound --> bound : ${dimmedMethod('bind')}`, `broken --> broken : ${dimmedMethod('repair')}`]));
    });

    it('marks the tree node example without an allowed state', () => {
        const diagram = lines(createMermaidDiagram(treeNode(), 'TB', false, true));

        expect(diagram).toEqual(expect.arrayContaining([
            'state "✕ childrenAllowed" as childrenAllowed',
            'class childrenAllowed ljStateInvalid',
            'class maybeHasChildren ljStateAccepted',
            `maybeHasChildren --> maybeHasChildren : ${calledMethod('getFirstChild')}`,
            `childrenAllowed --> maybeHasChildren : ${dimmedMethod('add')}`,
            `maybeHasChildren --> childrenAllowed : ${dimmedMethod('removeAllChildren')}`,
        ]));
        expect(diagram.join('\n')).not.toMatch(/maybeHasChildren" as|ljStateValid|ljStateDimmed/);
        // the constructor is dimmed although it leads to a possible state
        expect(dimmedTransitions(diagram.join('\n'))).toEqual(['%% lj-dimmed-transitions: edge0 edge1 edge2']);
    });

    it('only highlights the possible states when the accepted states are unknown', () => {
        const sm = treeNode({ acceptedStates: [], validStates: [], invalidStates: [] });

        expect(getStateErrorFocus(sm)).toBeNull();
        const diagram = createMermaidDiagram(sm, 'TB', false, true);
        expect(diagram).toBe(createMermaidDiagram(sm, 'TB', false, false));
        expect(diagram).toContain(`maybeHasChildren --> maybeHasChildren : ${calledMethod('getFirstChild')}`);
        expect(diagram).toContain('class childrenAllowed ljStateErrorActual');
        expect(diagram).not.toMatch(/ljStateValid|ljStateInvalid|ljStateAccepted|ljStateDimmed|" as /);
    });

    it('leaves the general diagram unchanged without an error', () => {
        expect(createMermaidDiagram(treeNode(null), 'TB', false, true)).toBe([
            'stateDiagram-v2',
            '    direction TB',
            '    [*] --> childrenAllowed : DefaultMutableTreeNode(Object)',
            '    childrenAllowed --> maybeHasChildren : add',
            '    maybeHasChildren --> childrenAllowed : removeAllChildren',
            '    maybeHasChildren --> maybeHasChildren : getFirstChild',
        ].join('\n'));
    });
});

describe('rendered state error focus', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('dims the rendered path and label of the listed transitions', async () => {
        const diagram = createMermaidDiagram(datagramSocket(), 'TB', false, true);
        document.body.innerHTML = '<div class="diagram-container"><div id="diagram-wrapper"><pre class="mermaid"></pre></div></div>';
        const pre = document.querySelector('.mermaid')!;
        pre.textContent = diagram;
        // edge markup copied from a Mermaid 11 state diagram rendered with the ELK layout
        const run = vi.fn(async () => {
            pre.innerHTML = '<svg>' + ['edge0', 'edge1', 'edge12'].map(id =>
                `<path class="transition" data-id="${id}"></path><g class="edgeLabel"><g class="label" data-id="${id}"></g></g>`).join('') + '</svg>';
        });

        await renderMermaidDiagram(document, { mermaid: { run } });

        const dimmed = (selector: string) => Array.from(document.querySelectorAll(selector), node => node.getAttribute('data-id'));
        expect(dimmed('path.transition.lj-dimmed')).toEqual(['edge0', 'edge1', 'edge12']);
        expect(dimmed('g.label.lj-dimmed')).toEqual(['edge0', 'edge1', 'edge12']);
    });
});

describe('collapsed labels', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    async function render() {
        const sm = datagramSocket();
        sm.transitions.push({ from: 'bound', to: 'bound', label: 'getPort' });
        const label = lines(createMermaidDiagram(sm, 'TB', false, true)).find(line => line.startsWith('bound --> bound'))!.split(' : ')[1];
        document.body.innerHTML = '<div class="diagram-container"><div id="diagram-wrapper"><pre class="mermaid">x</pre></div></div>';
        const pre = document.querySelector('.mermaid')!;
        const run = vi.fn(async () => {
            pre.innerHTML = `<svg><g class="edgeLabel"><foreignObject><div>${label}</div></foreignObject></g></svg>`;
        });
        await renderMermaidDiagram(document, { mermaid: { run } });
        return document.querySelector('.lj-collapsed-methods')!;
    }
    const popover = () => document.querySelector('.lj-methods-popover');
    const items = () => Array.from(document.querySelectorAll('.lj-methods-popover .lj-collapsed-item'), node => node.textContent);

    it('lists the methods on hover without rendering the diagram again', async () => {
        const label = await render();
        expect(popover()).toBeNull();

        label.dispatchEvent(new MouseEvent('mouseenter'));
        expect(items()).toEqual(['send', 'getPort']);
        label.dispatchEvent(new MouseEvent('mouseleave'));
        expect(popover()).toBeNull();
    });

    it('places the list beside the label, off the states', async () => {
        const label = await render();
        const box = (left: number, top: number, width: number, height: number) => ({ left, top, right: left + width, bottom: top + height }) as DOMRect;
        label.getBoundingClientRect = () => box(100, 100, 60, 20);
        // a state right of the label
        document.querySelector('svg')!.insertAdjacentHTML('beforeend', '<g class="node"></g>');
        document.querySelector<Element>('g.node')!.getBoundingClientRect = () => box(170, 50, 200, 120);
        const size = (name: 'offsetWidth' | 'offsetHeight', value: number) => vi.spyOn(HTMLElement.prototype, name, 'get').mockReturnValue(value);
        const spies = [size('offsetWidth', 80), size('offsetHeight', 40)];
        // a 1000 x 800 page, where fixed elements land where they are put
        vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1000);
        vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(800);
        vi.spyOn(HTMLDivElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLDivElement) {
            return box(parseFloat(this.style.left) || 0, parseFloat(this.style.top) || 0, 80, 40);
        });

        label.dispatchEvent(new MouseEvent('mouseenter'));
        expect((popover() as HTMLElement).style.left).toBe(`${100 - 6 - 80}px`);
        expect((popover() as HTMLElement).style.top).toBe('90px');
        spies.forEach(spy => spy.mockRestore());
        vi.restoreAllMocks();
    });

    it('keeps the list after a click until the next click, a pan, or a zoom', async () => {
        const label = await render();

        label.dispatchEvent(new MouseEvent('mouseenter'));
        label.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        label.dispatchEvent(new MouseEvent('mouseleave'));
        expect(items()).toEqual(['send', 'getPort']);
        label.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(popover()).toBeNull();

        label.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        document.querySelector('svg')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        expect(popover()).toBeNull();

        label.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        document.querySelector('.diagram-container')!.dispatchEvent(new WheelEvent('wheel'));
        expect(popover()).toBeNull();
    });
});

describe('fitting a focused diagram', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    async function render(focused: boolean, height: number) {
        document.body.innerHTML = `<div class="diagram-container"><div class="diagram-viewport${focused ? ' diagram-focused' : ''}"><div id="diagram-wrapper"><pre class="mermaid">x</pre></div></div></div>`;
        const pre = document.querySelector('.mermaid')!;
        const run = vi.fn(async () => {
            pre.innerHTML = '<svg><g class="ljStateInvalid"></g></svg>';
            Object.defineProperty(pre.querySelector('svg')!, 'clientHeight', { value: height });
        });
        document.querySelector('.diagram-viewport')!.getBoundingClientRect = () => ({ top: 200 }) as DOMRect;
        await renderMermaidDiagram(document, { mermaid: { run }, innerHeight: 816 });
        return (document.querySelector('.mermaid svg') as SVGSVGElement).style.maxHeight;
    }

    it('shrinks a tall diagram to the panel, but not below a readable scale', async () => {
        // 816 - 200 - 16 = 600 pixels are left below the summary
        expect(await render(true, 900)).toBe('600px');
        expect(await render(true, 2000)).toBe('1200px');
        expect(await render(true, 500)).toBe('');
    });

    it('leaves the diagram as it is when showing all', async () => {
        expect(await render(false, 900)).toBe('');
    });
});

describe('state errors on several state sets', () => {
    const tiling: LJStateMachine = { ...treeNode(null), className: 'ImageWriteParam', stateSet: 0 };
    const compression: LJStateMachine = { ...treeNode(), className: 'ImageWriteParam', stateSet: 1 };
    const other: LJStateMachine = { ...treeNode(null), className: 'ImageWriteParam', stateSet: 2 };

    it('puts the state sets with the error first, keeping the declaration order otherwise', () => {
        expect(orderStateMachines([tiling, compression, other])).toEqual([compression, tiling, other]);
        expect(orderStateMachines([tiling, other])).toEqual([tiling, other]);
    });

    it('focuses on the error of each state set that has it', () => {
        expect(getStateErrorFocuses([tiling, compression, other])).toEqual([getStateErrorFocus(compression)]);
        expect(getStateErrorFocuses([tiling, other])).toEqual([]);
    });
});
