import { StateMachine } from "../../types/fsm";

export function renderStateMachineView(sm: StateMachine, diagram: string): string {
    return /*html*/`
        <div class="diagram-section">
            <div class="diagram-container">
                <pre class="mermaid">${diagram}</pre>
            </div>
            <div>
                <p><strong>States:</strong> ${sm.states.join(', ')}</p>
                <p><strong>Initial state:</strong> ${sm.initial}</p>
                <p><strong>Number of states:</strong> ${sm.states.length}</p>
                <p><strong>Number of transitions:</strong> ${sm.transitions.length}</p>
            </div>
        </div>
    `;
}
