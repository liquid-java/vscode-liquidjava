export type StateMachine = {
    className: string;
    initial: string;
    states: string[];
    transitions: { from: string; to: string; on: string }[];
};
