// Type definitions used for representing finite state machines

export type LJStateMachine = {
    className: string;
    initialTransitions: { to: string; postCond?: string | null }[];
    states: string[];
    transitions: { from: string; to: string; label: string; preCond?: string | null; postCond?: string | null }[];
    errorContext: LJStateMachineErrorContext | null;
};

export type LJStateMachineErrorContext = {
    calledMethod: string | null;
    expectedStates: string[];
    actualStates: string[];
};
