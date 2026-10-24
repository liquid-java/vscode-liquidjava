import type { LJStateMachine } from "../../../types/fsm";
import { INVALID_STATE_ICON, VALID_STATE_ICON, getRejectedCallText, getStateErrorFocus, type StateErrorFocus } from "../../diagram-focus";
import { renderCodiconButton } from "../../icons";
import { escapeHtml } from "../../utils";
import { renderMainHeader } from "../sections";

export function renderStateMachineView(root: HTMLElement, sm: LJStateMachine | undefined, diagram: string, orientation: "LR" | "TB", showConditions: boolean, focusOnError = false) {
    const previousDiagramContainer = root.querySelector('.diagram-container') as HTMLElement | null;
    const diagramHeight = previousDiagramContainer?.offsetHeight;
    root.innerHTML = renderStateMachineViewHtml(sm, diagram, orientation, showConditions, focusOnError, diagramHeight);
}

function renderStateMachineViewHtml(sm: LJStateMachine | undefined, diagram: string, orientation: "LR" | "TB", showConditions: boolean, focusOnError: boolean, diagramHeight?: number): string {
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
            ${renderMainHeader("", 'fsm')}
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
                        ${errorFocus ? renderStateErrorSummary(errorFocus, focusOnError) + renderStateErrorLegend(errorFocus) : ''}
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

function renderStateErrorSummary(focus: StateErrorFocus, focusOnError: boolean): string {
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
            <button id="diagram-focus-btn" class="diagram-focus-btn" type="button">
                ${focusOnError ? 'Show all' : 'Focus on error'}
            </button>
        </div>
    `;
}

// explains the state marks with the same outlines, fills, and icons as the diagram
function renderStateErrorLegend(focus: StateErrorFocus): string {
    const items = [
        focus.invalidStates.length > 0 ? renderLegendItem('invalid', `${INVALID_STATE_ICON} Call rejected`) : '',
        focus.validStates.length > 0 ? renderLegendItem('valid', `${VALID_STATE_ICON} Call allowed`) : '',
        focus.acceptedStates.some(state => !focus.validStates.includes(state))
            ? renderLegendItem('accepted', 'Allowed, but not reachable here')
            : '',
    ].filter(Boolean);
    if (items.length === 0) return '';
    return `<div class="diagram-error-legend">${items.join('')}</div>`;
}

function renderLegendItem(kind: string, label: string): string {
    return `<span class="diagram-error-legend-item"><span class="diagram-error-legend-swatch diagram-error-legend-${kind}" aria-hidden="true"></span>${label}</span>`;
}

function renderStates(states: string[]): string {
    return states.map(state => `<code>${escapeHtml(state)}</code>`).join(' or ');
}
