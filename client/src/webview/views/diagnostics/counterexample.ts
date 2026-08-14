import type { Counterexample } from "../../../types/diagnostics";
import { renderHighlightedInlineExpression } from "../../highlighting";

export function renderCounterexample(counterexample: Counterexample): string {
    if (counterexample.assignments.length === 0) return "";

    return /*html*/`
        <div class="container vc-container counterexample-container">
            <div class="vc-chain">
                ${counterexample.assignments.map(assignment => /*html*/`
                    <div class="counterexample-line">
                        <span class="vc-node">${renderHighlightedInlineExpression(
                            `${assignment.variable} == ${assignment.value}`
                        )}</span>
                    </div>
                `).join("")}
            </div>
        </div>
    `;
}
