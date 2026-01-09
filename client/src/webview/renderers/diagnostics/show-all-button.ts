
export function renderShowAllButton(showAll: boolean): string {
    return /*html*/`
        <button class="show-all-button" title="Toggle filter diagnostics by current file">
            ${showAll ? 'Show in File' : 'Show All'}
        </button>
    `;
}
