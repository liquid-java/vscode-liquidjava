import type { LJStateMachine } from "../../../types/fsm";
import { renderCodicon } from "../../icons";
import { renderMainHeader } from "../sections";

export function renderStateMachineView(sm: LJStateMachine | undefined, diagram: string, orientation: "LR" | "TB", showConditions: boolean): string {
    const initialStateNames = sm ? [...new Set(sm.initialTransitions.map(transition => transition.to))] : [];
    const hasConditionExpansions = sm
        ? sm.initialTransitions.some(transition => !!transition.postCond)
            || sm.transitions.some(transition => !!transition.preCond || !!transition.postCond)
        : false;
    const conditionToggleLabel = showConditions ? 'Collapse Conditions' : 'Expand Conditions';

    return /*html*/`
        <div>
            ${renderMainHeader("", 'fsm')}
            ${sm ? /*html*/`
                <div class="diagram-section">
                    <div class="diagram-container">
                        <div class="diagram-controls">
                            <button id="zoom-in-btn" class="diagram-control-btn" title="Zoom In" aria-label="Zoom In">${renderCodicon("zoom-in")}</button>
                            <button id="zoom-out-btn" class="diagram-control-btn" title="Zoom Out" aria-label="Zoom Out">${renderCodicon("zoom-out")}</button>
                            <button id="zoom-reset-btn" class="diagram-control-btn" title="Reset Zoom" aria-label="Reset Zoom">${renderCodicon("refresh")}</button>
                            <button id="diagram-orientation-btn" class="diagram-control-btn" title="Rotate Diagram" aria-label="Rotate Diagram">${renderCodicon(orientation === "TB" ? "arrow-down" : "arrow-right")}</button>
                            <button id="diagram-conditions-btn" class="diagram-control-btn${showConditions ? ' active' : ''}" title="${conditionToggleLabel}" aria-label="${conditionToggleLabel}" aria-pressed="${showConditions ? 'true' : 'false'}" ${hasConditionExpansions ? '' : 'disabled'}>${renderCodicon(showConditions ? "collapse-all" : "expand-all")}</button>
                            <button id="copy-diagram-btn" class="diagram-control-btn" title="Copy Mermaid Source" aria-label="Copy Mermaid Source">${renderCodicon("copy")}</button>
                        </div>
                        <div id="diagram-wrapper" class="diagram-wrapper">
                            <pre class="mermaid">${diagram}</pre>
                        </div>
                    </div>
                    <div>
                        <p><strong>States:</strong> ${sm.states.join(', ')}</p>
                        <p><strong>Initial state${initialStateNames.length > 1 ? 's' : ''}:</strong> ${initialStateNames.join(', ')}</p>
                        <p><strong>Number of states:</strong> ${sm.states.length}</p>
                        <p><strong>Number of transitions:</strong> ${sm.transitions.length + sm.initialTransitions.length}</p>
                    </div>
                </div>`
            : 'No state machine available for the current file'}
        </div>
    `;
}
