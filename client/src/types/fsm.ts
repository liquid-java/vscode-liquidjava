// Type definitions used for representing finite state machines

export type LJStateMachine = {
    className: string;
    initialTransitions: { to: string; toCondition?: string | null; constructorSignature?: string | null }[];
    states: string[];
    transitions: { from: string; to: string; label: string; fromCondition?: string | null; toCondition?: string | null }[];
    errorContext: LJStateMachineErrorContext | null;
};

// The verifier's states of a rejected call, on the diagram's states
export type LJStateMachineErrorContext = {
    calledMethod: string;
    receiver: string;
    // states the receiver may be in at the call
    possibleStates: string[];
    // states from which the call is accepted, empty when they depend on more than the receiver's state
    acceptedStates: string[];
    // possible states from which the call is accepted
    validStates: string[];
    // possible states from which the call is rejected
    invalidStates: string[];
};
