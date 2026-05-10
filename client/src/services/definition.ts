import * as vscode from 'vscode';

type Definition = {
    uri: vscode.Uri;
}

export async function getDefinitions(document: vscode.TextDocument, position: vscode.Position): Promise<Definition[]> {
    try {
        const definitions = await vscode.commands.executeCommand<(vscode.Location | vscode.LocationLink)[]>(
            'vscode.executeDefinitionProvider',
            document.uri,
            position
        ) || [];
        return definitions.map(definition => definition instanceof vscode.Location
            ? { uri: definition.uri }
            : { uri: definition.targetUri }
        );
    } catch {
        return [];
    }
}

export function definitionMatchesClass(definition: Definition, targetClass: string): boolean {
    const uri = definition.uri.toString();
    return !!targetClass && (uri.includes(targetClass) || uri.includes(targetClass.replace(/\./g, '/')));
}
