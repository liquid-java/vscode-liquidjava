# Inspect the verifier's context

The **Context** tab follows your cursor or selection in the active Java file after verification.

- **Variables** show refinements known at the selected position.
- **Aliases** explain reusable predicates declared with `@RefinementAlias`.
- **Ghosts** describe additional object properties declared with `@Ghost`.

Move the cursor after an assignment to see the facts available there. Expand or collapse sections to focus on the information you need. If no context is available, verify the file and place the cursor inside a method.
