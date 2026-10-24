import type { LJStateMachine } from "../../../types/fsm";
import { INVALID_STATE_ICON, VALID_STATE_ICON, getRejectedCallText, getStateErrorFocus, type StateErrorFocus } from "../../diagram-focus";
import { renderCodiconButton } from "../../icons";
import { escapeHtml } from "../../utils";
import { renderMainHeader } from "../sections";

/**
 * The position of the shown state error among the state errors of the current file
 * The index is -1 when the shown error is from another file
 */
export type StateErrorNavigation = {
    index: number;
    count: number;
};

const NO_STATE_ERROR_NAVIGATION: StateErrorNavigation = { index: -1, count: 0 };

export function renderStateMachineView(root: HTMLElement, sm: LJStateMachine | undefined, diagram: string, orientation: "LR" | "TB", showConditions: boolean, focusOnError = false, stateErrors = NO_STATE_ERROR_NAVIGATION) {
    const previousDiagramContainer = root.querySelector('.diagram-container') as HTMLElement | null;
    const diagramHeight = previousDiagramContainer?.offsetHeight;
    root.innerHTML = renderStateMachineViewHtml(sm, diagram, orientation, showConditions, focusOnError, stateErrors, diagramHeight);
}

function renderStateMachineViewHtml(sm: LJStateMachine | undefined, diagram: string, orientation: "LR" | "TB", showConditions: boolean, focusOnError: boolean, stateErrors: StateErrorNavigation, diagramHeight?: number): string {
    const errorFocus = getStateErrorFocus(sm);
    const hasConditionExpansions = sm
        ? sm.initialTransitions.some(transition => !!transition.toCondition)
            || sm.transitions.some(transition => !!transition.fromCondition || !!transition.toCondition)
        : false;
    const conditionToggleLabel = !hasConditionExpansions
        ? 'No additional conditions to expand'
        : showConditions ? 'Collapse Conditions' : 'Expand Conditions';

    return /*html*/`
        <div>
            ${renderMainHeader("", 'fsm', stateErrors.count)}
            ${sm ? /*html*/`
                <div class="diagram-section">
                    <div class="diagram-container"${diagramHeight ? ` style="min-height: ${diagramHeight}px"` : ''}>
                        <div class="diagram-header">
                            <h2 class="diagram-title">${escapeHtml(sm.className)}</h2>
                            <div class="diagram-controls">
                                ${renderCodiconButton("zoom-in", { id: "zoom-in-btn", className: "diagram-control-btn", title: "Zoom In" })}
                                ${renderCodiconButton("zoom-out", { id: "zoom-out-btn", className: "diagram-control-btn", title: "Zoom Out" })}
                                ${renderCodiconButton("screen-normal", { id: "zoom-reset-btn", className: "diagram-control-btn", title: "Reset Zoom" })}
                                ${renderCodiconButton(orientation === "TB" ? "arrow-down" : "arrow-right", { id: "diagram-orientation-btn", className: "diagram-control-btn", title: "Toggle Orientation" })}
                                ${renderCodiconButton(showConditions ? "collapse-all" : "expand-all", { id: "diagram-conditions-btn", className: `diagram-control-btn${showConditions ? ' active' : ''}`, title: conditionToggleLabel, attributes: `aria-pressed="${showConditions ? 'true' : 'false'}"`, disabled: !hasConditionExpansions, errorBadge: hasConditionExpansions && !showConditions })}
                                ${renderCodiconButton("copy", { id: "copy-diagram-btn", className: "diagram-control-btn", title: "Copy Mermaid Source" })}
                            </div>
                        </div>
                        ${errorFocus ? renderStateErrorSummary(errorFocus, stateErrors) + renderStateErrorLegend(errorFocus, focusOnError) : ''}
                        ${showConditions && hasConditionExpansions ? /*html*/`
                            <div class="diagram-condition-legend">
                                <span class="diagram-condition-legend-pre">Precondition</span>
                                <span class="diagram-condition-legend-post">Postcondition</span>
                            </div>
                        ` : ''}
                        <div class="diagram-viewport">
                            <div id="diagram-wrapper" class="diagram-wrapper">
                                <pre class="mermaid">${diagram}</pre>
                            </div>
                        </div>
                    </div>
                </div>`
            : 'No state machine available for the current file'}
        </div>
    `;
}

function renderStateErrorSummary(focus: StateErrorFocus, stateErrors: StateErrorNavigation): string {
    const call = getRejectedCallText(focus);
    const receiver = focus.receiver ? `<code>${escapeHtml(focus.receiver)}</code>` : 'the receiver';
    const rejected = `${call ? `<code>${escapeHtml(call)}</code>` : 'The call'} is rejected`;
    const allowedStates = focus.unknownState ? focus.acceptedStates : focus.validStates;
    let summary: string;
    if (focus.unknownState) {
        summary = `${rejected}: the state of ${receiver} is unknown here`;
    } else if (focus.invalidStates.length > 0) {
        summary = `${rejected} when ${receiver} is in state ${renderStates(focus.invalidStates)}`;
    } else {
        summary = `${rejected} here`;
    }
    if (allowedStates.length > 0) summary += ` \u00B7 allowed in state ${renderStates(allowedStates)}`;
    return /*html*/`
        <div class="diagram-error-summary">
            <p class="diagram-error-text">${summary}</p>
            <div class="diagram-error-actions">
                ${stateErrors.index >= 0 && stateErrors.count > 1 ? renderStateErrorStepper(stateErrors) : ''}
                <button id="state-error-reveal-btn" class="state-error-reveal-btn" type="button" title="Show this error in the Verification tab">View error</button>
            </div>
        </div>
    `;
}

function renderStateErrorStepper({ index, count }: StateErrorNavigation): string {
    return /*html*/`
        <span class="state-error-stepper">
            ${renderCodiconButton("chevron-left", { className: "diagram-control-btn state-error-step-btn", title: "Previous state error", attributes: 'data-step="-1"', disabled: index <= 0 })}
            <span class="state-error-position">${index + 1} of ${count}</span>
            ${renderCodiconButton("chevron-right", { className: "diagram-control-btn state-error-step-btn", title: "Next state error", attributes: 'data-step="1"', disabled: index >= count - 1 })}
        </span>
    `;
}

// explains the state marks with the same outlines, fills, and icons as the diagram, next to the toggle that dims the rest
function renderStateErrorLegend(focus: StateErrorFocus, focusOnError: boolean): string {
    const items = [
        focus.invalidStates.length > 0 ? renderLegendItem('invalid', `${INVALID_STATE_ICON} Call rejected`) : '',
        focus.validStates.length > 0 ? renderLegendItem('valid', `${VALID_STATE_ICON} Call allowed`) : '',
        focus.acceptedStates.some(state => !focus.validStates.includes(state))
            ? renderLegendItem('accepted', 'Allowed, but not reachable here')
            : '',
    ].filter(Boolean);
    return /*html*/`
        <div class="diagram-error-legend">
            ${items.join('')}
            <button id="diagram-focus-btn" class="diagram-focus-btn" type="button">
                ${focusOnError ? 'Show all' : 'Focus on error'}
            </button>
        </div>
    `;
}

function renderLegendItem(kind: string, label: string): string {
    return `<span class="diagram-error-legend-item"><span class="diagram-error-legend-swatch diagram-error-legend-${kind}" aria-hidden="true"></span>${label}</span>`;
}

function renderStates(states: string[]): string {
    return states.map(state => `<code>${escapeHtml(state)}</code>`).join(' or ');
}
