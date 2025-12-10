

package dtos;

import dtos.diagnostics.LJDiagnosticDTO;
import dtos.errors.ArgumentMismatchErrorDTO;
import dtos.errors.CustomErrorDTO;
import dtos.errors.IllegalConstructorTransitionErrorDTO;
import dtos.errors.InvalidRefinementErrorDTO;
import dtos.errors.LJErrorDTO;
import dtos.errors.NotFoundErrorDTO;
import dtos.errors.RefinementErrorDTO;
import dtos.errors.StateConflictErrorDTO;
import dtos.errors.StateRefinementErrorDTO;
import dtos.errors.SyntaxErrorDTO;
import dtos.warnings.CustomWarningDTO;
import dtos.warnings.ExternalClassNotFoundWarningDTO;
import dtos.warnings.ExternalMethodNotFoundWarningDTO;
import dtos.warnings.LJWarningDTO;
import liquidjava.diagnostics.LJDiagnostic;
import liquidjava.diagnostics.errors.ArgumentMismatchError;
import liquidjava.diagnostics.errors.CustomError;
import liquidjava.diagnostics.errors.IllegalConstructorTransitionError;
import liquidjava.diagnostics.errors.InvalidRefinementError;
import liquidjava.diagnostics.errors.LJError;
import liquidjava.diagnostics.errors.NotFoundError;
import liquidjava.diagnostics.errors.RefinementError;
import liquidjava.diagnostics.errors.StateConflictError;
import liquidjava.diagnostics.errors.StateRefinementError;
import liquidjava.diagnostics.errors.SyntaxError;
import liquidjava.diagnostics.warnings.CustomWarning;
import liquidjava.diagnostics.warnings.ExternalClassNotFoundWarning;
import liquidjava.diagnostics.warnings.ExternalMethodNotFoundWarning;
import liquidjava.diagnostics.warnings.LJWarning;

/**
 * Utility class for converting LiquidJava diagnostic objects to their corresponding DTOs
 */
public class DiagnosticConverter {

    /**
     * Converts a diagnostic to its appropriate DTO type
     * @param diagnostic the diagnostic to convert
     * @return the corresponding DTO
     */
    public static Object convertToDTO(LJDiagnostic diagnostic) {
        if (diagnostic instanceof RefinementError d) {
            return RefinementErrorDTO.from(d);
        } else if (diagnostic instanceof StateRefinementError d) {
            return StateRefinementErrorDTO.from(d);
        } else if (diagnostic instanceof SyntaxError d) {
            return SyntaxErrorDTO.from(d);
        } else if (diagnostic instanceof CustomError d) {
            return CustomErrorDTO.from(d);
        } else if (diagnostic instanceof InvalidRefinementError d) {
            return InvalidRefinementErrorDTO.from(d);
        } else if (diagnostic instanceof StateConflictError d) {
            return StateConflictErrorDTO.from(d);
        } else if (diagnostic instanceof NotFoundError d) {
            return NotFoundErrorDTO.from(d);
        } else if (diagnostic instanceof IllegalConstructorTransitionError d) {
            return IllegalConstructorTransitionErrorDTO.from(d);
        } else if (diagnostic instanceof ArgumentMismatchError d) {
            return ArgumentMismatchErrorDTO.from(d);
        } else if (diagnostic instanceof ExternalClassNotFoundWarning d) {
            return ExternalClassNotFoundWarningDTO.from(d);
        } else if (diagnostic instanceof ExternalMethodNotFoundWarning d) {
            return ExternalMethodNotFoundWarningDTO.from(d);
        } else if (diagnostic instanceof CustomWarning d) {
            return CustomWarningDTO.from(d);
        } else if (diagnostic instanceof LJError d) {
            return LJErrorDTO.from(d);
        } else if (diagnostic instanceof LJWarning d) {
            return LJWarningDTO.from(d);
        } else {
            return LJDiagnosticDTO.from(diagnostic);
        }
    }
}
