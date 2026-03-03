
export function getSimpleName(qualifiedName: string): string {
    const parts = qualifiedName.split('.');
    return parts[parts.length - 1];
}

export function getOriginalVariableName(name: string): string {
    return name.split("_")[0].replace(/^#/, '');
}