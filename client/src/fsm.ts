
/**
 * Converts a StateMachine object to a Mermaid state diagram string
 * @param sm 
 * @returns Mermaid diagram string
 */
export function createMermaidDiagram(sm: StateMachine): string {
    const lines: string[] = [];

    // header
    lines.push('stateDiagram-v2');
    
    // initial state
    lines.push(`    [*] --> ${sm.initial}`);
    
    // transitions
    sm.transitions.forEach(transition => {
        lines.push(`    ${transition.from} --> ${transition.to} : ${transition.on}`);
    });
    
    return lines.join('\n');
}