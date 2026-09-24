// Type definitions used for representing finite state machines

export type LJStateMachine = {
    className: string;
    initialTransitions: { to: string; toCondition?: string | null; constructorSignature?: string | null }[];
    states: string[];
    transitions: { from: string; to: string; label: string; fromCondition?: string | null; toCondition?: string | null }[];
    errorContext: LJStateMachineErrorContext | null;
};

export type LJStateMachineErrorContext = {
    calledMethod: string | null;
    actualStates: string[];
};
