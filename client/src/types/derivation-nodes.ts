// Type definitions used in refinement errors for expanding node simplifications

export type DerivationNode = ValDerivationNode | VarDerivationNode | BinaryDerivationNode | UnaryDerivationNode;

export type ValDerivationNode = {
    value: any;
    origin: DerivationNode;
}

export type VarDerivationNode = {
    var: string;
    origin?: DerivationNode;
}

export type BinaryDerivationNode = {
    op: string;
    left: ValDerivationNode;
    right: ValDerivationNode;
}

export type UnaryDerivationNode = {
    op: string;
    operand: ValDerivationNode;
}
