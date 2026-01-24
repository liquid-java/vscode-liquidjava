// Type definitions used for representing finite state machines

export type StateMachine = {
    className: string;
    initial: string;
    states: string[];
    transitions: { from: string; to: string; label: string }[];
};
