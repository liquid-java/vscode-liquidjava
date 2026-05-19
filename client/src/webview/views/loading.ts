
import { renderMainHeader } from "./sections";

export function renderLoading(): string {
    return /*html*/`
        <div>
            ${renderMainHeader("Verification Pending", "diagnostics")}
            <p class="info">Running the LiquidJava verification...</p>
        </div>
    `;
}
