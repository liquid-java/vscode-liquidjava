import type { StateMachine } from "../../types/fsm";
import { renderMainHeader, type NavTab } from "./sections";

export function renderStateMachineView(sm: StateMachine, diagram: string, selectedTab: NavTab = 'state-machine', orientation: "LR" | "TB"): string {
    return /*html*/`
        <div>
            ${renderMainHeader("", selectedTab)}
            ${sm ? /*html*/`
                <div class="diagram-section">
                     <button id="diagram-orientation-btn" class="underline-button">
                        ${orientation === "TB" ? `Show diagram horizontally` : `Show diagram vertically`}
                    </button>
                    <div class="diagram-container">
                        <pre class="mermaid">${diagram}</pre>
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
