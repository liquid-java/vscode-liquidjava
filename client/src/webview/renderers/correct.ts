import { renderShowAllButton } from "./diagnostics/utils";

export function getCorrectView(showAllDiagnostics: boolean): string {
    return /*html*/`
        <div>
            <div class="header">
                <h2>Passed Verification</h2>
                ${renderShowAllButton(showAllDiagnostics)}
            </div>
            <p class="info">No errors were found by the LiquidJava verifier.</p>
        </div>
    `;
}
