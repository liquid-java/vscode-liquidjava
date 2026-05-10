import { SourcePosition } from "./diagnostics";

// Type definitions used for LiquidJava context information

export type LJVariable = {
  name: string;
  internalName: string;
  type: string;
  refinement: string;
  mainRefinement: string;
  position: SourcePosition| null;
  annotationPosition: SourcePosition | null;
}

export type LJGhost = {
  name: string;
  qualifiedName: string;
  returnType: string;
  parameterTypes: string[];
  refinement: string;
  isState: boolean;
  file: string;
}

export type LJAlias = {
  name: string;
  parameters: string[];
  types: string[];
  predicate: string;
}

export type LJMethodStateRefinement = {
  from: string | null;
  to: string | null;
  message: string | null;
}

export type LJMethod = {
  name: string;
  signature: string;
  targetClass: string;
  returnType: string;
  returnRefinement: string;
  parameters: LJVariable[];
  stateRefinements: LJMethodStateRefinement[];
  position: SourcePosition | null;
  annotationPosition: SourcePosition | null;
}

export type LJContext = {
  localVars: LJVariable[];
  globalVars: LJVariable[];
  ghosts: LJGhost[];
  aliases: LJAlias[];
  methods: LJMethod[];
  visibleVars: LJVariable[]; // variables visible in the current selection
  allVars: LJVariable[]; // instance vars + global vars + vars in scope
  fileScopes: Record<string, Range[]>; // file -> scopes
}

export type Range = {
  lineStart: number;
  colStart: number;
  lineEnd: number;
  colEnd: number;
}