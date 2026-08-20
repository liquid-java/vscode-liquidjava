
export function getSimpleName(qualifiedName: string): string {
    const parts = qualifiedName.split('.');
    return parts[parts.length - 1];
}

export function getFileName(file: string): string {
    return file.split(/[\\/]/).pop()?.trim() || file;
}

export function getOriginalVariableName(name: string): string {
    return name.split("_")[0].replace(/^#/, '');
}

export function escapeHtml(html: string): string {
    return html
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}