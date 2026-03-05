import { PlacementInCode, SourcePosition } from "./diagnostics";

// Type definitions used for LiquidJava context information

export type Variable = {
  name: string;
  type: string;
  refinement: string;
  mainRefinement: string;
  placementInCode: PlacementInCode | null;
  isParameter: boolean;
  annPosition: SourcePosition | null;
}

export type Ghost = {
  name: string;
  qualifiedName: string;
  returnType: string;
  parameterTypes: string[];
  refinement: string;
}

export type Alias = {
  name: string;
  parameters: string[];
  types: string[];
  predicate: string;
}

export type ContextHistory = {
  vars: Record<string, Record<string, Variable[]>>; // file -> (scope -> variables in scope)
  ghosts: Record<string, Ghost[]>; // file -> ghosts in file
  instanceVars: Variable[];
  globalVars: Variable[];
  aliases: Alias[];
}

export type Selection = {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}