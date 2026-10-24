import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LJStateMachine, LJStateMachineErrorContext } from '../../../types/fsm';
import { renderStateMachineView } from './fsm';

const diagram = 'stateDiagram-v2\n[*] --> Closed\nClosed --> Open: open';

function machine(overrides: Partial<LJStateMachine> = {}): LJStateMachine {
    return {
        className: 'Connection', states: ['Closed', 'Open'],
        initialTransitions: [{ to: 'Closed' }],
        transitions: [{ from: 'Closed', to: 'Open', label: 'open' }],
        errorContext: null, ...overrides,
    };
}

// socket.receive(), allowed while the socket is open, as the server reports it for the given possible states
function socketError(possibleStates: string[]): LJStateMachineErrorContext {
    const acceptedStates = ['unbound', 'bound', 'connected'];
    return {
        calledMethod: 'receive', receiver: 'socket', possibleStates, acceptedStates,
        validStates: possibleStates.filter(state => acceptedStates.includes(state)),
        invalidStates: possibleStates.filter(state => !acceptedStates.includes(state)),
    };
}

function button(id: string): HTMLButtonElement {
    return document.querySelector<HTMLButtonElement>(`#${id}`)!;
}

afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
});

describe('state machine view', () => {
    it('selects State Machine and shows an empty state when no machine is available', () => {
        renderStateMachineView(document.body, undefined, '', 'TB', false);

        expect(document.querySelector('.nav-tab.selected')?.textContent).toBe('State Machine');
        expect(document.body.textContent).toContain('No state machine available for the current file');
        expect(document.querySelector('.diagram-container')).toBeNull();
        expect(document.querySelector('.diagram-controls')).toBeNull();
    });

    it('renders the class, Mermaid source, and labeled diagram controls', () => {
        renderStateMachineView(document.body, machine(), diagram, 'TB', false);

        expect(document.querySelector('.diagram-title')?.textContent).toBe('Connection');
        expect(document.querySelector('.mermaid')?.textContent).toBe(diagram);
        expect(Array.from(document.querySelectorAll('.diagram-controls button'), node => node.getAttribute('aria-label'))).toEqual([
            'Zoom In', 'Zoom Out', 'Reset Zoom', 'Toggle Orientation',
            'No additional conditions to expand', 'Copy Mermaid Source',
        ]);
        for (const id of ['zoom-in-btn', 'zoom-out-btn', 'zoom-reset-btn', 'diagram-orientation-btn', 'copy-diagram-btn']) {
            expect(button(id).disabled).toBe(false);
        }
        expect(document.querySelector<HTMLElement>('.diagram-container')?.style.minHeight).toBe('');
    });

    it('escapes class titles while retaining their text', () => {
        const className = '<img src=x onerror="alert(1)"> & Connection';
        renderStateMachineView(document.body, machine({ className }), diagram, 'TB', false);

        const title = document.querySelector('.diagram-title')!;
        expect(title.textContent).toBe(className);
        expect(title.children).toHaveLength(0);
    });

    it.each([
        ['TB', 'arrow-down'], ['LR', 'arrow-right'],
    ] as const)('shows the %s orientation icon', (orientation, icon) => {
        renderStateMachineView(document.body, machine(), diagram, orientation, false);

        expect(button('diagram-orientation-btn').querySelector(`.codicon-${icon}`)).not.toBeNull();
    });

    it('disables condition expansion when transitions have no additional conditions', () => {
        renderStateMachineView(document.body, machine({
            initialTransitions: [{ to: 'Closed', toCondition: null }],
            transitions: [{ from: 'Closed', to: 'Open', label: 'open', fromCondition: '', toCondition: null }],
        }), diagram, 'TB', false);

        const toggle = button('diagram-conditions-btn');
        expect(toggle.disabled).toBe(true);
        expect(toggle.getAttribute('aria-label')).toBe('No additional conditions to expand');
        expect(toggle.querySelector('.icon-button-badge')).toBeNull();
        expect(document.querySelector('.diagram-condition-legend')).toBeNull();
    });

    it.each([
        ['initial transition postcondition', machine({ initialTransitions: [{ to: 'Closed', toCondition: 'size == 0' }] })],
        ['method precondition', machine({ transitions: [{ from: 'Closed', to: 'Open', label: 'open', fromCondition: 'size > 0' }] })],
        ['method postcondition', machine({ transitions: [{ from: 'Closed', to: 'Open', label: 'open', toCondition: 'size == 1' }] })],
    ] as const)('enables condition expansion for an %s', (_, stateMachine) => {
        renderStateMachineView(document.body, stateMachine, diagram, 'TB', false);

        expect(button('diagram-conditions-btn').disabled).toBe(false);
        expect(button('diagram-conditions-btn').getAttribute('aria-label')).toBe('Expand Conditions');
    });

    it.each([false, true])('renders condition controls and legend with showConditions=%s', showConditions => {
        renderStateMachineView(document.body, machine({
            initialTransitions: [{ to: 'Closed', toCondition: 'size == 0' }],
        }), diagram, 'TB', showConditions);

        const toggle = button('diagram-conditions-btn');
        const label = showConditions ? 'Collapse Conditions' : 'Expand Conditions';
        expect(toggle.title).toBe(label);
        expect(toggle.getAttribute('aria-label')).toBe(label);
        expect(toggle.getAttribute('aria-pressed')).toBe(String(showConditions));
        expect(toggle.classList.contains('active')).toBe(showConditions);
        expect(toggle.querySelector(showConditions ? '.codicon-collapse-all' : '.codicon-expand-all')).not.toBeNull();
        expect(toggle.querySelector('.icon-button-badge') !== null).toBe(!showConditions);
        const legend = document.querySelector('.diagram-condition-legend');
        if (showConditions) {
            expect(Array.from(legend!.querySelectorAll('span'), node => node.textContent)).toEqual(['Precondition', 'Postcondition']);
        } else {
            expect(legend).toBeNull();
        }
    });

    it('summarizes where the call is rejected and allowed in one line', () => {
        const errorMachine = machine({
            states: ['unbound', 'bound', 'connected', 'closed'],
            errorContext: socketError(['bound', 'closed']),
        });
        renderStateMachineView(document.body, errorMachine, diagram, 'TB', false, true);

        const summary = document.querySelector('.diagram-error-text')!;
        expect(summary.textContent).toBe('socket.receive() is rejected when socket is in state closed \u00B7 allowed in state bound');
        expect(Array.from(summary.querySelectorAll('code'), node => node.textContent)).toEqual(['socket.receive()', 'socket', 'closed', 'bound']);
        expect(button('diagram-focus-btn').textContent?.trim()).toBe('Show all');

        renderStateMachineView(document.body, errorMachine, diagram, 'TB', false, false);
        expect(button('diagram-focus-btn').textContent?.trim()).toBe('Focus on error');
    });

    it('omits the allowed part of the summary when no possible state accepts the call', () => {
        renderStateMachineView(document.body, machine({
            states: ['childrenAllowed', 'maybeHasChildren'],
            errorContext: {
                calledMethod: 'getFirstChild', receiver: 'root', possibleStates: ['childrenAllowed'],
                acceptedStates: ['maybeHasChildren'], validStates: [], invalidStates: ['childrenAllowed'],
            },
        }), diagram, 'TB', false, true);

        expect(document.querySelector('.diagram-error-text')?.textContent).toBe('root.getFirstChild() is rejected when root is in state childrenAllowed');
    });

    it.each([
        [
            'the state of the receiver is unknown',
            ['unbound', 'bound', 'connected', 'closed'],
            'socket.receive() is rejected: the state of socket is unknown here \u00B7 allowed in state unbound or bound or connected',
        ],
        [
            'every possible state accepts the call',
            ['bound'],
            'socket.receive() is rejected here \u00B7 allowed in state bound',
        ],
    ])('summarizes the error when %s', (_, possibleStates, summary) => {
        renderStateMachineView(document.body, machine({
            states: ['unbound', 'bound', 'connected', 'closed'],
            errorContext: socketError(possibleStates),
        }), diagram, 'TB', false, true);

        expect(document.querySelector('.diagram-error-text')?.textContent).toBe(summary);
    });

    it.each([
        ['invalid, valid, and other accepted states', ['bound', 'closed'], ['\u2715 Call rejected', '\u2713 Call allowed', 'Allowed, but not reachable here']],
        ['only an invalid and other accepted states', ['closed'], ['\u2715 Call rejected', 'Allowed, but not reachable here']],
        ['an unknown receiver state', ['unbound', 'bound', 'connected', 'closed'], ['Allowed, but not reachable here']],
    ])('explains the state marks in a legend with %s', (_, possibleStates, items) => {
        renderStateMachineView(document.body, machine({
            states: ['unbound', 'bound', 'connected', 'closed'],
            errorContext: socketError(possibleStates),
        }), diagram, 'TB', false, true);

        const legend = document.querySelectorAll('.diagram-error-legend-item');
        expect(Array.from(legend, item => item.textContent)).toEqual(items);
        expect(Array.from(legend, item => item.querySelector('.diagram-error-legend-swatch')?.getAttribute('aria-hidden'))).toEqual(items.map(() => 'true'));
    });

    it.each([
        ['no error', null],
        ['an error context without the accepted states', {
            calledMethod: 'open', receiver: 'counter', possibleStates: ['Closed'],
            acceptedStates: [], validStates: [], invalidStates: [],
        }],
    ])('omits the error summary with %s', (_, errorContext) => {
        renderStateMachineView(document.body, machine({ errorContext }), diagram, 'TB', false, true);

        expect(document.querySelector('.diagram-error-summary')).toBeNull();
        expect(document.querySelector('.diagram-error-legend')).toBeNull();
        expect(document.querySelector('#diagram-focus-btn')).toBeNull();
    });

    it('clips the panned diagram below the error summary and legend', () => {
        renderStateMachineView(document.body, machine({
            errorContext: {
                calledMethod: 'read', receiver: 'counter', possibleStates: ['Closed'],
                acceptedStates: ['Open'], validStates: [], invalidStates: ['Closed'],
            },
        }), diagram, 'TB', false, true);

        const viewport = document.querySelector('.diagram-viewport')!;
        expect(viewport.querySelector('#diagram-wrapper .mermaid')).not.toBeNull();
        for (const selector of ['.diagram-header', '.diagram-error-summary', '.diagram-error-legend']) {
            expect(document.querySelector(selector)?.compareDocumentPosition(viewport)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
        }
    });

    it('preserves the previous diagram container height when rerendering', () => {
        renderStateMachineView(document.body, machine(), diagram, 'TB', false);
        const previousContainer = document.querySelector<HTMLElement>('.diagram-container')!;
        vi.spyOn(previousContainer, 'offsetHeight', 'get').mockReturnValue(240);

        renderStateMachineView(document.body, machine({ className: 'UpdatedConnection' }), diagram, 'LR', false);

        const container = document.querySelector<HTMLElement>('.diagram-container')!;
        expect(container).not.toBe(previousContainer);
        expect(container.style.minHeight).toBe('240px');
        expect(document.querySelector('.diagram-title')?.textContent).toBe('UpdatedConnection');
    });

    it('steps through several state errors and links back to the shown one', () => {
        const errorMachine = machine({
            errorContext: { calledMethod: 'read', actualStates: ['Closed'], expectedStates: ['Open'], possibleStates: ['Closed'] },
        });
        const stepButtons = () => Array.from(document.querySelectorAll<HTMLButtonElement>('.state-error-step-btn'),
            node => [node.getAttribute('aria-label'), node.disabled]);

        renderStateMachineView(document.body, errorMachine, diagram, 'TB', false, true, { index: 0, count: 3 });
        expect(document.querySelector('.state-error-position')?.textContent).toBe('1 of 3');
        expect(stepButtons()).toEqual([['Previous state error', true], ['Next state error', false]]);
        expect(button('state-error-reveal-btn').textContent).toBe('View error');
        expect(document.querySelector('.nav-tab.selected .nav-badge')?.textContent).toBe('3');

        renderStateMachineView(document.body, errorMachine, diagram, 'TB', false, true, { index: 2, count: 3 });
        expect(document.querySelector('.state-error-position')?.textContent).toBe('3 of 3');
        expect(stepButtons()).toEqual([['Previous state error', false], ['Next state error', true]]);

        renderStateMachineView(document.body, errorMachine, diagram, 'TB', false, true, { index: 0, count: 1 });
        expect(document.querySelector('.state-error-stepper')).toBeNull();
        expect(button('state-error-reveal-btn')).not.toBeNull();
    });

    it.each([
        ['the file state machine', machine()],
        ['no state machine', undefined],
    ])('points to the state errors of the file when none is shown, with %s', (_, sm) => {
        renderStateMachineView(document.body, sm, sm ? diagram : '', 'TB', false, false, { index: -1, count: 2 });

        expect(document.querySelector('.diagram-error-text')?.textContent).toBe('2 state errors found');
        expect(button('state-error-show-btn').textContent).toBe('Show first');
        expect(document.querySelector('#diagram-focus-btn')).toBeNull();
        expect(document.querySelector('.nav-badge')?.textContent).toBe('2');
        expect(document.body.textContent).not.toContain('No state machine available');

        renderStateMachineView(document.body, sm, sm ? diagram : '', 'TB', false, false, { index: -1, count: 1 });
        expect(document.querySelector('.diagram-error-text')?.textContent).toBe('1 state error found');
        expect(button('state-error-show-btn').textContent).toBe('Show error');
    });

    it('shows no state error badge or hint when the file has no state errors', () => {
        renderStateMachineView(document.body, machine(), diagram, 'TB', false, false, { index: -1, count: 0 });

        expect(document.querySelector('.nav-badge')).toBeNull();
        expect(document.querySelector('.diagram-error-summary')).toBeNull();
    });
});
