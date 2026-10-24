import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LJStateMachine, LJStateMachineErrorContext } from '../types/fsm';
import { createMermaidDiagram, renderMermaidDiagram } from './diagram';
import { getRelatedStates, getStateErrorFocus } from './diagram-focus';

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
            actualStates: ['childrenAllowed'],
            receiver: 'root',
            expectedStates: ['maybeHasChildren'],
            definiteFoundState: 'childrenAllowed',
            possibleStates: ['childrenAllowed'],
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
            actualStates: ['bound', 'closed'],
            receiver: 'socket',
            expectedStates: open,
            expectedCondition: 'unbound(socket) || bound(socket) || connected(socket)',
            foundCondition: 'flag ? closed(socket) : bound(socket)',
            definiteFoundState: null,
            possibleStates: ['bound', 'closed'],
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
// removes the hooks that only style the focused diagram
const withoutDimming = (diagram: string) => lines(diagram.replace(/<span class="lj-dimmed-method">(.*?)<\/span>/g, '$1'))
    .filter(line => !line.startsWith('%%') && !line.endsWith('ljStateDimmed'));

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

    it.each([
        ['the definite found state', { possibleStates: undefined, definiteFoundState: 'closed' }, [], ['closed']],
        ['the found states', { possibleStates: undefined, definiteFoundState: null }, ['bound'], ['closed']],
    ])('falls back to %s without possible states', (_, errorContext, validStates, invalidStates) => {
        const focus = getStateErrorFocus(datagramSocket(errorContext));

        expect(focus?.validStates).toEqual(validStates);
        expect(focus?.invalidStates).toEqual(invalidStates);
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
            for (const state of ['unbound', 'bound', 'connected']) {
                expect(diagram).toContain(`${state} --> ${state} : ${calledMethod('receive')}<br/>${send}`);
            }
            // accepted states that are not possible get only a class, without a mark in their name
            expect(diagram.filter(line => /^(state|class) .*\b(unbound|connected)\b/.test(line)))
                .toEqual(['class unbound,connected ljStateAccepted']);
            expect(diagram.join('\n')).not.toContain('ljStateErrorActual');
        }
    });

    it('dims the states and transitions unrelated to the error when focused, without changing the labels', () => {
        const focused = createMermaidDiagram(datagramSocket(), 'TB', false, true);
        const full = createMermaidDiagram(datagramSocket(), 'TB', false, false);

        expect(lines(focused)).toContain('class broken ljStateDimmed');
        // both initial transitions, then bind, disconnect, close from unbound and connected, repair, and discard
        expect(dimmedTransitions(focused)).toEqual(['%% lj-dimmed-transitions: edge0 edge1 edge2 edge4 edge8 edge10 edge11 edge12']);
        // focusing only adds styling hooks, so the layout stays the same
        expect(withoutDimming(focused)).toEqual(lines(full));
        expect(full).not.toMatch(/ljStateDimmed|lj-dimmed/);
    });

    it('only keeps the failed method and the ways out of the possible states bright', () => {
        const diagram = lines(createMermaidDiagram(datagramSocket(), 'TB', false, true));

        expect(diagram).toEqual(expect.arrayContaining([
            // leaving a possible state for another state
            'bound --> connected : connect',
            'bound --> closed : close',
            // self loops and transitions from other states
            `bound --> bound : ${calledMethod('receive')}<br/>${dimmedMethod('send')}`,
            `unbound --> bound : ${dimmedMethod('bind')}`,
            `connected --> bound : ${dimmedMethod('disconnect')}`,
            `broken --> closed : ${dimmedMethod('discard')}`,
        ]));
    });

    it('dims each method of a merged label, and the transition only when all of them are dimmed', () => {
        const sm = datagramSocket();
        sm.transitions.push(
            { from: 'broken', to: 'broken', label: 'receive' },
            { from: 'bound', to: 'connected', label: 'reconnect' },
        );

        const diagram = createMermaidDiagram(sm, 'TB', false, true);
        expect(lines(diagram)).toEqual(expect.arrayContaining([
            `broken --> broken : ${dimmedMethod('repair')}<br/>${calledMethod('receive')}`,
            'bound --> connected : connect<br/>reconnect',
        ]));
        // the self loop of broken keeps its path for the failed method
        expect(dimmedTransitions(diagram)).toEqual(['%% lj-dimmed-transitions: edge0 edge1 edge2 edge4 edge8 edge10 edge12']);
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
            .toContain(`bound --> bound : ${calledMethod('receive')}<br/>${dimmedMethod('send')}<br/>${dimmedMethod('receiveAll')}`);
    });

    it.each([
        ['no accepted states', { expectedStates: [], possibleStates: [] }],
        ['accepted states outside the machine', { expectedStates: ['listening'] }],
    ])('does not focus with %s', (_, errorContext) => {
        const sm = datagramSocket(errorContext);

        expect(getStateErrorFocus(sm)).toBeNull();
        const diagram = createMermaidDiagram(sm, 'TB', false, true);
        expect(diagram).not.toMatch(/ljStateDimmed|lj-dimmed-transitions|ljStateValid|ljStateInvalid/);
        expect(diagram).toContain('class bound,closed ljStateErrorActual');
    });

    it('ignores possible states outside the machine and falls back when none are given', () => {
        expect(getStateErrorFocus(datagramSocket({ possibleStates: ['closed', 'listening'] }))?.possibleStates).toEqual(['closed']);
        expect(getStateErrorFocus(datagramSocket({ possibleStates: [] }))?.possibleStates).toEqual(['bound', 'closed']);
    });

    it('only hints at the accepted states when the state of the receiver is unknown', () => {
        const sm = datagramSocket({ possibleStates: ['unbound', 'bound', 'connected', 'closed', 'broken'], foundCondition: 'true' });

        const focus = getStateErrorFocus(sm);
        expect(focus).toMatchObject({ unknownState: true, validStates: [], invalidStates: [] });
        const diagram = createMermaidDiagram(sm, 'TB', false, true);
        expect(lines(diagram)).toContain('class unbound,bound,connected ljStateAccepted');
        expect(diagram).not.toMatch(/ljStateValid|ljStateInvalid|ljStateDimmed|" as /);
        // every state is possible, so only the self loops other than the failed method are dimmed
        expect(lines(diagram)).toEqual(expect.arrayContaining(['unbound --> bound : bind', `broken --> broken : ${dimmedMethod('repair')}`]));
    });

    it('marks the tree node example without an allowed state', () => {
        const diagram = lines(createMermaidDiagram(treeNode(), 'TB', false, true));

        expect(diagram).toEqual(expect.arrayContaining([
            'state "✕ childrenAllowed" as childrenAllowed',
            'class childrenAllowed ljStateInvalid',
            'class maybeHasChildren ljStateAccepted',
            `maybeHasChildren --> maybeHasChildren : ${calledMethod('getFirstChild')}`,
            // add leaves childrenAllowed, removeAllChildren does not start from a possible state
            'childrenAllowed --> maybeHasChildren : add',
            `maybeHasChildren --> childrenAllowed : ${dimmedMethod('removeAllChildren')}`,
        ]));
        expect(diagram.join('\n')).not.toMatch(/maybeHasChildren" as|ljStateValid|ljStateDimmed/);
        // the constructor is dimmed although it leads to a possible state
        expect(dimmedTransitions(diagram.join('\n'))).toEqual(['%% lj-dimmed-transitions: edge0 edge2']);
    });

    it('keeps the previous highlighting for an error context without the accepted states', () => {
        const sm = treeNode();
        sm.errorContext = { calledMethod: 'getFirstChild', actualStates: ['childrenAllowed'] };

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
