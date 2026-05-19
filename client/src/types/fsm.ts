// Type definitions used for representing finite state machines

export type LJStateMachine = {
    className: string;
    initialTransitions: { to: string; cond?: string | null }[];
    states: string[];
    transitions: { from: string; to: string; label: string; cond?: string | null }[];
};
