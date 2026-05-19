export function renderCodicon(name: string, className = ""): string {
    const classes = ["codicon", `codicon-${name}`, className].filter(Boolean).join(" ");
    return `<span class="${classes}" aria-hidden="true"></span>`;
}
