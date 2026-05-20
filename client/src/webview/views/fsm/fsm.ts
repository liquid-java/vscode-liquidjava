import type { LJStateMachine } from "../../../types/fsm";
import { renderCodiconButton } from "../../icons";
import { renderMainHeader } from "../sections";

export function renderStateMachineView(root: HTMLElement, sm: LJStateMachine | undefined, diagram: string, orientation: "LR" | "TB", showConditions: boolean) {
    const previousDiagramContainer = root.querySelector('.diagram-container') as HTMLElement | null;
    const diagramHeight = previousDiagramContainer?.offsetHeight;
    root.innerHTML = renderStateMachineViewHtml(sm, diagram, orientation, showConditions, diagramHeight);
}

function renderStateMachineViewHtml(sm: LJStateMachine | undefined, diagram: string, orientation: "LR" | "TB", showConditions: boolean, diagramHeight?: number): string {
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
                    <div class="diagram-container"${diagramHeight ? ` style="min-height: ${diagramHeight}px"` : ''}>
                        <div class="diagram-controls">
                            ${renderCodiconButton("zoom-in", { id: "zoom-in-btn", className: "diagram-control-btn", title: "Zoom In" })}
                            ${renderCodiconButton("zoom-out", { id: "zoom-out-btn", className: "diagram-control-btn", title: "Zoom Out" })}
                            ${renderCodiconButton("refresh", { id: "zoom-reset-btn", className: "diagram-control-btn", title: "Reset Zoom" })}
                            ${renderCodiconButton(orientation === "TB" ? "arrow-down" : "arrow-right", { id: "diagram-orientation-btn", className: "diagram-control-btn", title: "Rotate Diagram" })}
                            ${renderCodiconButton(showConditions ? "collapse-all" : "expand-all", { id: "diagram-conditions-btn", className: `diagram-control-btn${showConditions ? ' active' : ''}`, title: conditionToggleLabel, attributes: `aria-pressed="${showConditions ? 'true' : 'false'}"`, disabled: !hasConditionExpansions })}
                            ${renderCodiconButton("copy", { id: "copy-diagram-btn", className: "diagram-control-btn", title: "Copy Mermaid Source" })}
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
