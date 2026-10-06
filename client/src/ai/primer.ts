// LiquidJava background given to the model before it explains an error.
// Adapted from the liquidjava-mcp skill (skills/liquidjava-mcp/SKILL.md, "Syntax")
// and liquidjava-docs (pages/diagnostics/understanding-refinement-errors.md).
// Keep in sync with those sources when the syntax or the error format changes.

export type PrimerVariant = "none" | "syntax" | "full";

export const PRIMER_VARIANTS: PrimerVariant[] = ["none", "syntax", "full"];

const SYNTAX = `LiquidJava is a compile-time checker for Java based on refinement types and typestates.
Refinements constrain values; typestates constrain object states and the order of method calls.

Annotations:
- @Refinement("pred") on a variable, field, parameter or return type: the value must satisfy pred.
  \`_\` refers to the refined value, e.g. @Refinement("_ > 0").
- @RefinementAlias("Pos(int x) { x > 0 }") defines a reusable predicate.
- @StateSet({"open", "closed"}) declares the named states an object can be in.
- @StateRefinement(from="open(this)", to="closed(this)") on a method: it may only be called when
  the object satisfies \`from\`, and afterwards the object satisfies \`to\`.
- @Ghost("int size") declares a tracked property of an object, used as size(this).
- old(this) refers to the object before the call, e.g. size(this) == size(old(this)) + 1.
- @ExternalRefinementsFor("java.io.X") gives specifications for a library class whose source
  is not available; its methods carry the annotations above.`;

const READING_ERRORS = `Reading LiquidJava errors:
- "Refinement Error: A is not a subtype of B" and "found A but expected B" mean the verifier could
  not prove that everything satisfying A (what it knows at that point) also satisfies B (what is
  required there).
- "State Refinement Error: found s1(x) but expected s2(x)" means the object x is in the wrong
  state for this call; some EARLIER call or constructor moved it into s1.
- A counterexample gives concrete values that satisfy what is known but violate what is required.
- Names with superscript numbers (x⁷⁵, #ret²) are internal copies the verifier creates for the
  variable x or for a return value. Always refer to them by their source name (x, the return value).
- The reported line is where a requirement is checked. It is often NOT where the mistake is:
  trace back to where the value was computed or where the object's state changed.`;

export function getPrimer(variant: PrimerVariant): string {
    switch (variant) {
        case "none": return "";
        case "syntax": return SYNTAX;
        case "full": return `${SYNTAX}\n\n${READING_ERRORS}`;
    }
}
