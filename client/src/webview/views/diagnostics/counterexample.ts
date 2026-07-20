import { renderHighlightedInlineExpression } from "../../highlighting";

function getCounterexampleLines(counterexample: string): string[] {
    return counterexample
        .split("&&")
        .map(assignment => assignment.trim())
        .filter(Boolean);
}

export function renderCounterexample(counterexample: string): string {
    const lines = getCounterexampleLines(counterexample);
    if (lines.length === 0) return "";

    return /*html*/`
        <div class="container vc-container counterexample-container">
            <div class="vc-chain">
                ${lines.map(line => /*html*/`
                    <div class="counterexample-line">
                        <span class="vc-node">${renderHighlightedInlineExpression(line)}</span>
                    </div>
                `).join("")}
            </div>
        </div>
    `;
}
