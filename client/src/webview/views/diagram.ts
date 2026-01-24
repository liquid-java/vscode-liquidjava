import type { StateMachine } from "../../types/fsm";
import { renderMainHeader, type NavTab } from "./sections";

export function renderStateMachineView(sm: StateMachine, diagram: string, selectedTab: NavTab = 'state-machine'): string {
    return /*html*/`
        <div>
            ${renderMainHeader("", selectedTab)}
            ${sm ? /*html*/`
                <div class="diagram-section">
                    <div class="diagram-container">
                        <pre class="mermaid">${diagram}</pre>
                    </div>
                    <div>
                        <p><strong>States:</strong> ${sm.states.join(', ')}</p>
                        <p><strong>Initial state:</strong> ${sm.initial}</p>
                        <p><strong>Number of states:</strong> ${sm.states.length}</p>
                        <p><strong>Number of transitions:</strong> ${sm.transitions.length + 1}</p>
                    </div>
                </div>`
            : 'No state machine available for the current file'}
        </div>
    `;
}
