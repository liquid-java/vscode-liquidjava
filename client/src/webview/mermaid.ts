import type { StateMachine } from "../types/fsm";

/**
 * Converts a StateMachine object to a Mermaid state diagram string
 * @param sm 
 * @returns Mermaid diagram string
 */
export function createMermaidDiagram(sm: StateMachine): string {
    if (!sm) return '';
    
    const lines: string[] = [];

    // header
    lines.push('---');
    lines.push(`title: ${sm.className}`);
    lines.push('---');
    lines.push('stateDiagram-v2');
    
    // initial states
    sm.initialStates.forEach(state => {
        lines.push(`    [*] --> ${state}`);
    });
    
    // group transitions by from/to states and merge labels
    const transitionMap = new Map<string, string[]>();
    sm.transitions.forEach(transition => {
        const key = `${transition.from}|${transition.to}`;
        if (!transitionMap.has(key)) transitionMap.set(key, []);
        transitionMap.get(key).push(transition.label);
    });

    // add transitions
    transitionMap.forEach((labels, key) => {
        const [from, to] = key.split('|');
        const mergedLabel = labels.join(', ');
        lines.push(`    ${from} --> ${to} : ${mergedLabel}`);
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