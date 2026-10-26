import type { LJStateMachine } from "../../../types/fsm";
import { INVALID_STATE_ICON, VALID_STATE_ICON, getRejectedCallText, getStateErrorFocuses, type StateErrorFocus } from "../../diagram-focus";
import { renderCodiconButton } from "../../icons";
import { escapeHtml } from "../../utils";
import { renderMainHeader, type NavBadges } from "../sections";

/**
 * The position of the shown state error among the state errors of the current file
 * The index is -1 when the shown error is from another file
 */
export type StateErrorNavigation = {
    index: number;
    count: number;
    // the 1-based line of the shown error, if any error is shown
    line?: number | null;
};

const NO_STATE_ERROR_NAVIGATION: StateErrorNavigation = { index: -1, count: 0 };

/**
 * Renders the State Machine view with the diagram of each state set of a class, stacked
 * @param sms the state machines, one per state set
 * @param diagrams the Mermaid diagram of each state machine
 */
export function renderStateMachineView(root: HTMLElement, sms: LJStateMachine[], diagrams: string[], orientation: "LR" | "TB", showConditions: boolean, focusOnError = false, stateErrors = NO_STATE_ERROR_NAVIGATION, badges: NavBadges = { errors: 0, stateErrors: stateErrors.count }) {
    const previousDiagramContainer = root.querySelector('.diagram-container') as HTMLElement | null;
    const diagramHeight = previousDiagramContainer?.offsetHeight;
    root.innerHTML = renderStateMachineViewHtml(sms, diagrams, orientation, showConditions, focusOnError, stateErrors, badges, diagramHeight);
}

function renderStateMachineViewHtml(sms: LJStateMachine[], diagrams: string[], orientation: "LR" | "TB", showConditions: boolean, focusOnError: boolean, stateErrors: StateErrorNavigation, badges: NavBadges, diagramHeight?: number): string {
    const className = sms[0]?.className;
    const errorFocuses = getStateErrorFocuses(sms);
    const hasConditionExpansions = sms.some(sm =>
        sm.initialTransitions.some(transition => !!transition.toCondition)
            || sm.transitions.some(transition => !!transition.fromCondition || !!transition.toCondition));
    const conditionToggleLabel = !hasConditionExpansions
        ? 'No additional conditions to expand'
        : showConditions ? 'Collapse Conditions' : 'Expand Conditions';

    return /*html*/`
        <div>
            ${renderMainHeader("", 'fsm', badges)}
            ${className !== undefined ? /*html*/`
                <div class="diagram-section">
                    <div class="diagram-container"${diagramHeight ? ` style="min-height: ${diagramHeight}px"` : ''}>
                        <div class="diagram-header">
                            <h2 class="diagram-title">${escapeHtml(className)}</h2>
                            <div class="diagram-controls">
                                ${renderCodiconButton("zoom-in", { id: "zoom-in-btn", className: "diagram-control-btn", title: "Zoom In" })}
                                ${renderCodiconButton("zoom-out", { id: "zoom-out-btn", className: "diagram-control-btn", title: "Zoom Out" })}
                                ${renderCodiconButton("screen-normal", { id: "zoom-reset-btn", className: "diagram-control-btn", title: "Reset Zoom" })}
                                ${renderCodiconButton(orientation === "TB" ? "arrow-down" : "arrow-right", { id: "diagram-orientation-btn", className: "diagram-control-btn", title: "Toggle Orientation" })}
                                ${renderCodiconButton(showConditions ? "collapse-all" : "expand-all", { id: "diagram-conditions-btn", className: `diagram-control-btn${showConditions ? ' active' : ''}`, title: conditionToggleLabel, attributes: `aria-pressed="${showConditions ? 'true' : 'false'}"`, disabled: !hasConditionExpansions, errorBadge: hasConditionExpansions && !showConditions })}
                                ${renderCodiconButton("copy", { id: "copy-diagram-btn", className: "diagram-control-btn", title: "Copy Mermaid Source" })}
                            </div>
                        </div>
                        ${errorFocuses.length > 0
                            ? renderStateErrorSummary(getStateErrorSummary(errorFocuses), stateErrors) + renderStateErrorLegend(errorFocuses, focusOnError)
                            : isStateErrorShown(stateErrors) ? renderStateErrorSummary(getUnmarkedStateErrorSummary(sms, stateErrors), stateErrors) : ''}
                        ${showConditions && hasConditionExpansions ? /*html*/`
                            <div class="diagram-condition-legend">
                                <span class="diagram-condition-legend-pre">Precondition</span>
                                <span class="diagram-condition-legend-post">Postcondition</span>
                            </div>
                        ` : ''}
                        <div class="diagram-viewport">
                            <div id="diagram-wrapper" class="diagram-wrapper">
                                ${sms.length === 1
                                    ? `<pre class="mermaid">${diagrams[0]}</pre>`
                                    : sms.map((sm, i) => renderStateSetDiagram(sm, diagrams[i], focusOnError && errorFocuses.length > 0)).join('')}
                            </div>
                        </div>
                    </div>
                </div>`
            : 'No state machine available for the current file'}
        </div>
    `;
}

// the diagram of one state set, labelled with its states, and dimmed when focusing on an error of another state set
function renderStateSetDiagram(sm: LJStateMachine, diagram: string, dimUnrelated: boolean): string {
    const dimmed = dimUnrelated && !sm.errorContext;
    return /*html*/`
        <div class="diagram-state-set${dimmed ? ' diagram-state-set-dimmed' : ''}">
            <h3 class="diagram-state-set-title">${sm.states.map(state => escapeHtml(state)).join(' \u00B7 ')}</h3>
            <pre class="mermaid">${diagram}</pre>
        </div>
    `;
}

function isStateErrorShown(stateErrors: StateErrorNavigation): boolean {
    return stateErrors.index >= 0 || stateErrors.line !== undefined;
}

// summarises the error of every state set it involves, which is rejected when the receiver is in any invalid state
function getStateErrorSummary(focuses: StateErrorFocus[]): string {
    const focus = focuses[0];
    const call = getRejectedCallText(focus);
    const receiver = focus.receiver ? `<code>${escapeHtml(focus.receiver)}</code>` : 'the receiver';
    const rejected = `${call ? `<code>${escapeHtml(call)}</code>` : 'The call'} is rejected`;
    const invalidStates = focuses.flatMap(focus => focus.invalidStates);
    const allowedStates = focuses
        .map(focus => focus.unknownState ? focus.acceptedStates : focus.validStates)
        .filter(states => states.length > 0);
    let summary: string;
    if (invalidStates.length > 0) {
        summary = `${rejected} when ${receiver} is in state ${renderStates(invalidStates)}`;
    } else if (focuses.every(focus => focus.unknownState)) {
        summary = `${rejected}: the state of ${receiver} is unknown here`;
    } else {
        summary = `${rejected} here`;
    }
    // the call needs an allowed state of each state set
    if (allowedStates.length > 0) {
        summary += ` \u00B7 allowed in state ${allowedStates
            .map(states => allowedStates.length > 1 && states.length > 1 ? `(${renderStates(states)})` : renderStates(states))
            .join(' and ')}`;
    }
    return summary;
}

// the shown error cannot be marked on the diagrams when the verifier could not tell which states allow the call
function getUnmarkedStateErrorSummary(sms: LJStateMachine[], stateErrors: StateErrorNavigation): string {
    const context = sms.find(sm => sm.errorContext)?.errorContext;
    const call = context ? getRejectedCallText(context) : null;
    if (call) return `<code>${escapeHtml(call)}</code> is rejected here`;
    return stateErrors.line ? `The call at line ${stateErrors.line} is rejected` : 'The call is rejected';
}

function renderStateErrorSummary(summary: string, stateErrors: StateErrorNavigation): string {
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
function renderStateErrorLegend(focuses: StateErrorFocus[], focusOnError: boolean): string {
    const items = [
        focuses.some(focus => focus.invalidStates.length > 0) ? renderLegendItem('invalid', `${INVALID_STATE_ICON} Call rejected`) : '',
        focuses.some(focus => focus.validStates.length > 0) ? renderLegendItem('valid', `${VALID_STATE_ICON} Call allowed`) : '',
        focuses.some(focus => focus.acceptedStates.some(state => !focus.validStates.includes(state)))
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
