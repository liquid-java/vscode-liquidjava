
export function getSimpleName(qualifiedName: string): string {
    const parts = qualifiedName.split('.');
    return parts[parts.length - 1];
}