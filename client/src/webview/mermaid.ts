import type { StateMachine } from "../types/fsm";

/**
 * Converts a StateMachine object to a Mermaid state diagram string
 * @param sm 
 * @returns Mermaid diagram string
 */
export function createMermaidDiagram(sm: StateMachine): string {
    const lines: string[] = [];

    // header
    lines.push('---');
    lines.push(`title: ${sm.className}`);
    lines.push('---');
    lines.push('stateDiagram-v2');
    
    // initial state
    lines.push(`    [*] --> ${sm.initial}`);
    
    // transitions
    sm.transitions.forEach(transition => {
        lines.push(`    ${transition.from} --> ${transition.to} : ${transition.label}`);
    });
    
    return lines.join('\n');
}

export async function renderMermaidDiagram(document: any, window: any) {
    const mermaid = (window as any).mermaid;
    if (!mermaid) return;

    const mermaidElements = document.querySelectorAll('.mermaid');
    if (mermaidElements.length === 0) return;

    try {
        await mermaid.run({ nodes: mermaidElements });
    } catch (e) {
        console.error('Failed to render Mermaid diagram:', e);
    }
}