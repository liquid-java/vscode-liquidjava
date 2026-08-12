package dtos.errors;

import java.io.File;

import dtos.diagnostics.SourcePositionDTO;
import dtos.diagnostics.VCSimplificationResultDTO;
import fsm.StateMachine;
import fsm.StateMachineParser;
import liquidjava.diagnostics.errors.StateRefinementError;
import liquidjava.rj_language.ast.formatter.ExpressionFormatter;

/**
 * DTO for serializing StateRefinementError instances to JSON
 */
public class StateRefinementErrorDTO extends LJErrorDTO {

    public final String expected;
    public final VCSimplificationResultDTO found;
    public final String customMessage;
    public final SourcePositionDTO declarationPosition;
    public final StateMachine stateMachine;

    public StateRefinementErrorDTO(StateRefinementError error) {
        super("state-refinement-error", error);
        this.expected = error.getExpected() == null ? null : ExpressionFormatter.format(error.getExpected());
        this.found = VCSimplificationResultDTO.from(error.getFoundSimplification());
        this.customMessage = error.getCustomMessage();
        this.declarationPosition = SourcePositionDTO.from(error.getDeclarationPosition());
        this.stateMachine = declarationPosition == null || declarationPosition.file() == null ? null
                : StateMachineParser.parseWithErrorContext(
                        new File(declarationPosition.file()).toURI().toString(),
                        error.getDeclarationPosition(),
                        error.getExpected() == null ? null : error.getExpected().getExpression(),
                        error.getFound());
    }

    public static StateRefinementErrorDTO from(StateRefinementError error) {
        return new StateRefinementErrorDTO(error);
    }
}
