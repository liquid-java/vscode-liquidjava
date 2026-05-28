type StoppedViewStatus = "stopped" | "crashed";

const stoppedViewContent: Record<StoppedViewStatus, { title: string; message: string }> = {
    stopped: {
        title: "LiquidJava Not Running",
        message: /*html*/`To use LiquidJava, run <code>LiquidJava: Start</code> from the command palette.`,
    },
    crashed: {
        title: "LiquidJava Crashed",
        message: /*html*/`LiquidJava could not verify this project. <br /> Check for Java compilation errors.<br /><br />To inspect the problem, run <code>LiquidJava: Show Logs</code> from the command palette.`,
    },
};

export function renderStopped(status: StoppedViewStatus): string {
    const { title, message } = stoppedViewContent[status];
    return /*html*/`
        <div class="stopped-view">
            <div class="stopped-status-icon" aria-hidden="true">!</div>
            <h2>${title}</h2>
            <p class="info">${message}</p>
        </div>
    `;
}
