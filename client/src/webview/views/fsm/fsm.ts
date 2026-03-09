import type { LJStateMachine } from "../../../types/fsm";
import { renderMainHeader } from "../sections";

export function renderStateMachineView(sm: LJStateMachine, diagram: string, orientation: "LR" | "TB"): string {
    return /*html*/`
        <div>
            ${renderMainHeader("", 'fsm')}
            ${sm ? /*html*/`
                <div class="diagram-section">
                    <div class="diagram-container">
                        <div class="diagram-controls">
                            <button id="zoom-in-btn" class="diagram-control-btn" title="Zoom In">+</button>
                            <button id="zoom-out-btn" class="diagram-control-btn" title="Zoom Out">-</button>
                            <button id="zoom-reset-btn" class="diagram-control-btn" title="Reset Zoom">⟲</button>
                            <button id="diagram-orientation-btn" class="diagram-control-btn" title="Rotate Diagram">${orientation === "TB" ? "↓" : "→"}</button>
                            <button id="copy-diagram-btn" class="diagram-control-btn" title="Copy Mermaid Source">⎘</button>
                        </div>
                        <div id="diagram-wrapper" class="diagram-wrapper">
                            <pre class="mermaid">${diagram}</pre>
                        </div>
                    </div>
                    <div>
                        <p><strong>States:</strong> ${sm.states.join(', ')}</p>
                        <p><strong>Initial state${sm.initialStates.length > 1 ? 's' : ''}:</strong> ${sm.initialStates.join(', ')}</p>
                        <p><strong>Number of states:</strong> ${sm.states.length}</p>
                        <p><strong>Number of transitions:</strong> ${sm.transitions.length + 1}</p>
                    </div>
                </div>`
            : 'No state machine available for the current file'}
        </div>
    `;
}
