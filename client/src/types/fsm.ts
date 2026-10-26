// Type definitions used for representing finite state machines

// The state machine of one state set of a class
export type LJStateMachine = {
    className: string;
    // index of the state set among the class's @StateSet annotations, in declaration order
    stateSet?: number;
    initialTransitions: { to: string; toCondition?: string | null; constructorSignature?: string | null }[];
    states: string[];
    transitions: { from: string; to: string; label: string; fromCondition?: string | null; toCondition?: string | null }[];
    // the state error on this state set, null if the call does not involve it
    errorContext?: LJStateMachineErrorContext | null;
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
