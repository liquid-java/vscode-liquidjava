import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LJStateMachine } from '../../../types/fsm';
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
});
