export function renderCodicon(name: string, className = ""): string {
    const classes = ["codicon", `codicon-${name}`, className].filter(Boolean).join(" ");
    return `<span class="${classes}" aria-hidden="true"></span>`;
}

type CodiconButtonOptions = {
    id?: string;
    className?: string;
    title: string;
    ariaLabel?: string;
    attributes?: string;
    disabled?: boolean;
    errorBadge?: boolean;
};

export function renderCodiconButton(iconName: string, options: CodiconButtonOptions): string {
    const classes = ["icon-button", options.className, options.errorBadge ? "icon-button-badged" : ""].filter(Boolean).join(" ");
    const id = options.id ? ` id="${options.id}"` : "";
    const ariaLabel = ` aria-label="${options.ariaLabel ?? options.title}"`;
    const attributes = options.attributes ? ` ${options.attributes}` : "";
    const disabled = options.disabled ? " disabled" : "";

    const badge = options.errorBadge ? '<span class="icon-button-badge" aria-hidden="true">!</span>' : "";
    return `<button${id} class="${classes}" title="${options.title}"${ariaLabel}${attributes}${disabled} type="button">${renderCodicon(iconName)}${badge}</button>`;
}
