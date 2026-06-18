export type VCImplication = {
    name: string | null;
    type: string | null;
    predicate: string;
    next: VCImplication | null;
}

export type VCSimplificationResult = {
    implication: VCImplication;
    origin: VCSimplificationResult | null;
}
