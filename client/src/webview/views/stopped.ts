export function renderStopped(): string {
    return /*html*/`
        <div class="stopped-view">
            <div class="stopped-status-icon" aria-hidden="true">!</div>
            <h2>LiquidJava Not Running</h2>
            <p class="info">To use LiquidJava, run <code>LiquidJava: Start</code> from the command palette</p>
        </div>
    `;
}
