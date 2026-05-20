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
};

export function renderCodiconButton(iconName: string, options: CodiconButtonOptions): string {
    const classes = ["icon-button", options.className].filter(Boolean).join(" ");
    const id = options.id ? ` id="${options.id}"` : "";
    const ariaLabel = ` aria-label="${options.ariaLabel ?? options.title}"`;
    const attributes = options.attributes ? ` ${options.attributes}` : "";
    const disabled = options.disabled ? " disabled" : "";

    return `<button${id} class="${classes}" title="${options.title}"${ariaLabel}${attributes}${disabled} type="button">${renderCodicon(iconName)}</button>`;
}
