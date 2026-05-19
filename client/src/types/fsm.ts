// Type definitions used for representing finite state machines

export type LJStateMachine = {
    className: string;
    initialStates: string[];
    states: string[];
    transitions: { from: string; to: string; label: string; cond?: string | null }[];
};
