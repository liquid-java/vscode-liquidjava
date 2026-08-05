import java.util.List;

import liquidjava.diagnostics.errors.LJError;

/**
 * Verifier errors produced by a verification run.
 */
public record LJDiagnostics(List<LJError> errors) {}
