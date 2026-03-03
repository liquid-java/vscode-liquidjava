import { PlacementInCode, SourcePosition } from "./diagnostics";

// Type definitions used for LiquidJava context information

export type LJVariable = {
  name: string;
  type: string;
  refinement: string;
  mainRefinement: string;
  placementInCode: PlacementInCode | null;
  isParameter: boolean;
  annPosition: SourcePosition | null;
}

export type LJGhost = {
  name: string;
  qualifiedName: string;
  returnType: string;
  parameterTypes: string[];
  refinement: string;
}

export type LJAlias = {
  name: string;
  parameters: string[];
  types: string[];
  predicate: string;
}

export type LJContext = {
  vars: Record<string, Record<string, LJVariable[]>>; // file -> (scope -> variables in scope)
  ghosts: Record<string, LJGhost[]>; // file -> ghosts in file
  instanceVars: LJVariable[];
  globalVars: LJVariable[];
  aliases: LJAlias[];
  varsInScope: LJVariable[]; // variables in scope for the current selection
  allVars: LJVariable[]; // instance vars + global vars + vars in scope
}

export type Selection = {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}