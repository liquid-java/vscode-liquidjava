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
        renderStateMachineView(document.body, [], [], 'TB', false);

        expect(document.querySelector('.nav-tab.selected')?.textContent).toBe('State Machine');
        expect(document.body.textContent).toContain('No state machine available for the current file');
        expect(document.querySelector('.diagram-container')).toBeNull();
        expect(document.querySelector('.diagram-controls')).toBeNull();
    });

    it('renders the class, Mermaid source, and labeled diagram controls', () => {
        renderStateMachineView(document.body, [machine()], [diagram], 'TB', false);

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
        renderStateMachineView(document.body, [machine({ className })], [diagram], 'TB', false);

        const title = document.querySelector('.diagram-title')!;
        expect(title.textContent).toBe(className);
        expect(title.children).toHaveLength(0);
    });

    it.each([
        ['TB', 'arrow-down'], ['LR', 'arrow-right'],
    ] as const)('shows the %s orientation icon', (orientation, icon) => {
        renderStateMachineView(document.body, [machine()], [diagram], orientation, false);

        expect(button('diagram-orientation-btn').querySelector(`.codicon-${icon}`)).not.toBeNull();
    });

    it('disables condition expansion when transitions have no additional conditions', () => {
        renderStateMachineView(document.body, [machine({
            initialTransitions: [{ to: 'Closed', toCondition: null }],
            transitions: [{ from: 'Closed', to: 'Open', label: 'open', fromCondition: '', toCondition: null }],
        })], [diagram], 'TB', false);

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
        ['entry transition postcondition', machine({ entryTransitions: [{ to: 'Open', label: 'isOpen', toCondition: 'return' }] })],
    ] as const)('enables condition expansion for an %s', (_, stateMachine) => {
        renderStateMachineView(document.body, [stateMachine], [diagram], 'TB', false);

        expect(button('diagram-conditions-btn').disabled).toBe(false);
        expect(button('diagram-conditions-btn').getAttribute('aria-label')).toBe('Expand Conditions');
    });

    it.each([false, true])('renders condition controls and legend with showConditions=%s', showConditions => {
        renderStateMachineView(document.body, [machine({
            initialTransitions: [{ to: 'Closed', toCondition: 'size == 0' }],
        })], [diagram], 'TB', showConditions);

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

    it('summarizes the invalid call with the expected and actual states in one line', () => {
        const errorMachine = machine({
            states: ['unbound', 'bound', 'connected', 'closed'],
            errorContext: socketError(['bound', 'closed']),
        });
        renderStateMachineView(document.body, [errorMachine], [diagram], 'TB', false, true);

        const summary = document.querySelector('.diagram-error-text')!;
        expect(summary.textContent).toBe('Invalid method call socket.receive() \u00B7 expected state unbound or bound or connected \u00B7 actual state bound or closed');
        expect(Array.from(summary.querySelectorAll('code'), node => node.textContent)).toEqual(['socket.receive()', 'unbound', 'bound', 'connected', 'bound', 'closed']);
        expect(button('diagram-focus-btn').textContent?.trim()).toBe('Show all');

        renderStateMachineView(document.body, [errorMachine], [diagram], 'TB', false, false);
        expect(button('diagram-focus-btn').textContent?.trim()).toBe('Focus on error');
    });

    it('names the expected and actual states when no actual is expected', () => {
        renderStateMachineView(document.body, [machine({
            states: ['childrenAllowed', 'maybeHasChildren'],
            errorContext: {
                calledMethod: 'getFirstChild', receiver: 'root', possibleStates: ['childrenAllowed'],
                acceptedStates: ['maybeHasChildren'], validStates: [], invalidStates: ['childrenAllowed'],
            },
        })], [diagram], 'TB', false, true);

        expect(document.querySelector('.diagram-error-text')?.textContent).toBe('Invalid method call root.getFirstChild() \u00B7 expected state maybeHasChildren \u00B7 actual state childrenAllowed');
    });

    it.each([
        [
            'the state of the receiver is unknown',
            ['unbound', 'bound', 'connected', 'closed'],
            'Invalid method call socket.receive() \u00B7 expected state unbound or bound or connected \u00B7 actual state unknown',
        ],
        [
            'every actual is expected',
            ['bound'],
            'Invalid method call socket.receive() \u00B7 expected state unbound or bound or connected \u00B7 actual state bound',
        ],
    ])('summarizes the error when %s', (_, possibleStates, summary) => {
        renderStateMachineView(document.body, [machine({
            states: ['unbound', 'bound', 'connected', 'closed'],
            errorContext: socketError(possibleStates),
        })], [diagram], 'TB', false, true);

        expect(document.querySelector('.diagram-error-text')?.textContent).toBe(summary);
    });

    it.each([
        ['invalid, valid, and other accepted states', ['bound', 'closed'], ['\u2715 Actual state, not expected', '\u2713 Actual state, expected', 'Expected state']],
        ['only an invalid and other accepted states', ['closed'], ['\u2715 Actual state, not expected', 'Expected state']],
        ['an unknown receiver state', ['unbound', 'bound', 'connected', 'closed'], ['Expected state']],
    ])('explains the state marks in a legend with %s', (_, possibleStates, items) => {
        renderStateMachineView(document.body, [machine({
            states: ['unbound', 'bound', 'connected', 'closed'],
            errorContext: socketError(possibleStates),
        })], [diagram], 'TB', false, true);

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
        renderStateMachineView(document.body, [machine({ errorContext })], [diagram], 'TB', false, true);

        expect(document.querySelector('.diagram-error-summary')).toBeNull();
        expect(document.querySelector('.diagram-error-legend')).toBeNull();
        expect(document.querySelector('#diagram-focus-btn')).toBeNull();
    });

    it.each([
        ['without the accepted states', {
            calledMethod: 'open', receiver: 'counter', possibleStates: ['Closed'],
            acceptedStates: [], validStates: [], invalidStates: [],
        }, 'Invalid method call counter.open()'],
        ['without an error context', null, 'Invalid method call at line 12'],
    ])('keeps the stepper and View error for a shown error %s', (_, errorContext, text) => {
        renderStateMachineView(document.body, [machine({ errorContext })], [diagram], 'TB', false, true, { index: 1, count: 2, line: 12 });

        expect(document.querySelector('.diagram-error-text')?.textContent).toBe(text);
        expect(document.querySelector('.state-error-position')?.textContent).toBe('2 of 2');
        expect(button('state-error-reveal-btn')).not.toBeNull();
        // nothing is marked, so there is nothing to explain or dim
        expect(document.querySelector('.diagram-error-legend')).toBeNull();
        expect(document.querySelector('#diagram-focus-btn')).toBeNull();
    });

    it('names the invalid call without a line when the shown error has no position', () => {
        renderStateMachineView(document.body, [machine()], [diagram], 'TB', false, true, { index: -1, count: 0, line: null });

        expect(document.querySelector('.diagram-error-text')?.textContent).toBe('Invalid method call');
    });

    it('clips the panned diagram below the error summary and legend', () => {
        renderStateMachineView(document.body, [machine({
            errorContext: {
                calledMethod: 'read', receiver: 'counter', possibleStates: ['Closed'],
                acceptedStates: ['Open'], validStates: [], invalidStates: ['Closed'],
            },
        })], [diagram], 'TB', false, true);

        const viewport = document.querySelector('.diagram-viewport')!;
        expect(viewport.querySelector('#diagram-wrapper .mermaid')).not.toBeNull();
        for (const selector of ['.diagram-header', '.diagram-error-summary', '.diagram-error-legend']) {
            expect(document.querySelector(selector)?.compareDocumentPosition(viewport)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
        }
    });

    it('preserves the previous diagram container height when rerendering', () => {
        renderStateMachineView(document.body, [machine()], [diagram], 'TB', false);
        const previousContainer = document.querySelector<HTMLElement>('.diagram-container')!;
        vi.spyOn(previousContainer, 'offsetHeight', 'get').mockReturnValue(240);

        renderStateMachineView(document.body, [machine({ className: 'UpdatedConnection' })], [diagram], 'LR', false);

        const container = document.querySelector<HTMLElement>('.diagram-container')!;
        expect(container).not.toBe(previousContainer);
        expect(container.style.minHeight).toBe('240px');
        expect(document.querySelector('.diagram-title')?.textContent).toBe('UpdatedConnection');
    });

    it('steps through several state errors and links back to the shown one', () => {
        const errorMachine = machine({
            errorContext: { calledMethod: 'read', receiver: 'connection', possibleStates: ['Closed'], acceptedStates: ['Open'], validStates: [], invalidStates: ['Closed'] },
        });
        const stepButtons = () => Array.from(document.querySelectorAll<HTMLButtonElement>('.state-error-step-btn'),
            node => [node.getAttribute('aria-label'), node.disabled]);

        renderStateMachineView(document.body, [errorMachine], [diagram], 'TB', false, true, { index: 0, count: 3 });
        expect(document.querySelector('.state-error-position')?.textContent).toBe('1 of 3');
        expect(stepButtons()).toEqual([['Previous state error', true], ['Next state error', false]]);
        expect(button('state-error-reveal-btn').textContent).toBe('View error');
        expect(document.querySelector('.nav-tab.selected .nav-badge')?.textContent).toBe('3');

        renderStateMachineView(document.body, [errorMachine], [diagram], 'TB', false, true, { index: 2, count: 3 });
        expect(document.querySelector('.state-error-position')?.textContent).toBe('3 of 3');
        expect(stepButtons()).toEqual([['Previous state error', false], ['Next state error', true]]);

        renderStateMachineView(document.body, [errorMachine], [diagram], 'TB', false, true, { index: 0, count: 1 });
        expect(document.querySelector('.state-error-stepper')).toBeNull();
        expect(button('state-error-reveal-btn')).not.toBeNull();
    });

    it('shows an error chosen from another file without stepping through the errors of the file', () => {
        const errorMachine = machine({
            errorContext: { calledMethod: 'read', receiver: 'connection', possibleStates: ['Closed'], acceptedStates: ['Open'], validStates: [], invalidStates: ['Closed'] },
        });
        renderStateMachineView(document.body, [errorMachine], [diagram], 'TB', false, true, { index: -1, count: 2 });

        expect(document.querySelector('.state-error-stepper')).toBeNull();
        expect(button('state-error-reveal-btn')).not.toBeNull();
        expect(document.querySelector('.nav-badge')?.textContent).toBe('2');
    });

    it('keeps the focus toggle with the legend, apart from the error actions', () => {
        const errorMachine = machine({
            errorContext: { calledMethod: 'read', receiver: 'connection', possibleStates: ['Closed'], acceptedStates: ['Open'], validStates: [], invalidStates: ['Closed'] },
        });
        renderStateMachineView(document.body, [errorMachine], [diagram], 'TB', false, true, { index: 0, count: 3 });

        expect(button('diagram-focus-btn').closest('.diagram-error-legend')).not.toBeNull();
        expect(document.querySelector('.diagram-error-actions #diagram-focus-btn')).toBeNull();
    });

    it('shows no state error badge or summary when the file has no state errors', () => {
        renderStateMachineView(document.body, [machine()], [diagram], 'TB', false, false, { index: -1, count: 0 });

        expect(document.querySelector('.nav-badge')).toBeNull();
        expect(document.querySelector('.diagram-error-summary')).toBeNull();
    });

    describe('several state sets', () => {
        // ImageWriteParam: setCompressionType() needs compressionExplicit, whatever the tiling state
        const tiling = machine({
            className: 'ImageWriteParam', stateSet: 0, states: ['startTiling', 'tilingSet'],
            transitions: [{ from: 'startTiling', to: 'tilingSet', label: 'setTiling' }],
        });
        const compression = machine({
            className: 'ImageWriteParam', stateSet: 1, states: ['startCompression', 'compressionExplicit'],
            transitions: [{ from: 'startCompression', to: 'compressionExplicit', label: 'setCompressionMode' }],
        });
        const compressionError: LJStateMachineErrorContext = {
            calledMethod: 'setCompressionType', receiver: 'param', possibleStates: ['startCompression'],
            acceptedStates: ['compressionExplicit'], validStates: [], invalidStates: ['startCompression'],
        };

        it('renders one labelled diagram per state set under the class title', () => {
            renderStateMachineView(document.body, [tiling, compression], ['tiling diagram', 'compression diagram'], 'TB', false);

            expect(document.querySelectorAll('.diagram-title')).toHaveLength(1);
            expect(document.querySelector('.diagram-title')?.textContent).toBe('ImageWriteParam');
            expect(Array.from(document.querySelectorAll('.diagram-state-set-title'), node => node.textContent))
                .toEqual(['startTiling \u00B7 tilingSet', 'startCompression \u00B7 compressionExplicit']);
            expect(Array.from(document.querySelectorAll('.diagram-state-set .mermaid'), node => node.textContent))
                .toEqual(['tiling diagram', 'compression diagram']);
            expect(document.querySelectorAll('#diagram-wrapper')).toHaveLength(1);
        });

        it('keeps a single state set without a state set label', () => {
            renderStateMachineView(document.body, [tiling], [diagram], 'TB', false);

            expect(document.querySelector('.diagram-state-set')).toBeNull();
            expect(document.querySelector('.mermaid')?.textContent).toBe(diagram);
        });

        it('dims the diagrams of the state sets the error does not involve when focusing on it', () => {
            const sms = [{ ...compression, errorContext: compressionError }, tiling];
            renderStateMachineView(document.body, sms, ['compression diagram', 'tiling diagram'], 'TB', false, true);

            expect(Array.from(document.querySelectorAll('.diagram-state-set'), node => node.classList.contains('diagram-state-set-dimmed')))
                .toEqual([false, true]);
            expect(document.querySelector('.diagram-error-text')?.textContent)
                .toBe('Invalid method call param.setCompressionType() \u00B7 expected state compressionExplicit \u00B7 actual state startCompression');

            renderStateMachineView(document.body, sms, ['compression diagram', 'tiling diagram'], 'TB', false, false);
            expect(document.querySelector('.diagram-state-set-dimmed')).toBeNull();
        });

        it('summarizes a call that needs a state of each state set', () => {
            // write() needs tilingSet and compressionExplicit, the receiver is in startTiling and compressionExplicit
            const write = { calledMethod: 'write', receiver: 'param' };
            const sms = [
                { ...tiling, errorContext: { ...write, possibleStates: ['startTiling'], acceptedStates: ['tilingSet'], validStates: [], invalidStates: ['startTiling'] } },
                { ...compression, errorContext: { ...write, possibleStates: ['compressionExplicit'], acceptedStates: ['compressionExplicit'], validStates: ['compressionExplicit'], invalidStates: [] } },
            ];
            renderStateMachineView(document.body, sms, ['tiling diagram', 'compression diagram'], 'TB', false, true);

            expect(document.querySelector('.diagram-error-text')?.textContent)
                .toBe('Invalid method call param.write() \u00B7 expected state tilingSet and compressionExplicit \u00B7 actual state startTiling and compressionExplicit');
            expect(document.querySelector('.diagram-state-set-dimmed')).toBeNull();
            expect(Array.from(document.querySelectorAll('.diagram-error-legend-item'), node => node.textContent))
                .toEqual(['\u2715 Actual state, not expected', '\u2713 Actual state, expected', 'Expected state']);
        });

        it('names the call of the state set with the error when it cannot be marked', () => {
            const unmarked = { ...compressionError, acceptedStates: [], invalidStates: [] };
            renderStateMachineView(document.body, [{ ...compression, errorContext: unmarked }, tiling],
                ['compression diagram', 'tiling diagram'], 'TB', false, true, { index: 0, count: 1, line: 7 });

            expect(document.querySelector('.diagram-error-text')?.textContent).toBe('Invalid method call param.setCompressionType()');
            // nothing is marked, so nothing is dimmed
            expect(document.querySelector('.diagram-state-set-dimmed')).toBeNull();
        });
    });
});
