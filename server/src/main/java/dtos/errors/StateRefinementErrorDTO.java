package dtos.errors;

import java.io.File;

import dtos.diagnostics.SourcePositionDTO;
import dtos.diagnostics.VCSimplificationResultDTO;
import dtos.fsm.StateMachineDTO;
import liquidjava.diagnostics.errors.StateErrorContext;
import liquidjava.diagnostics.errors.StateRefinementError;
import liquidjava.fsm.StateMachineParser;
import liquidjava.rj_language.ast.formatter.ExpressionFormatter;

/**
 * DTO for serializing StateRefinementError instances to JSON
 */
public class StateRefinementErrorDTO extends LJErrorDTO {

    public final String expected;
    public final VCSimplificationResultDTO found;
    public final String customMessage;
    public final SourcePositionDTO declarationPosition;
    public final StateMachineDTO stateMachine;

    public StateRefinementErrorDTO(StateRefinementError error) {
        super("state-refinement-error", error);
        this.expected = error.getExpected() == null ? null : ExpressionFormatter.format(error.getExpected());
        this.found = VCSimplificationResultDTO.from(error.getFoundSimplification());
        this.customMessage = error.getCustomMessage();
        this.declarationPosition = SourcePositionDTO.from(error.getDeclarationPosition());
        StateErrorContext context = error.getContext();
        this.stateMachine = declarationPosition == null || declarationPosition.file() == null ? null
                : StateMachineDTO.from(StateMachineParser.parse(new File(declarationPosition.file()).toURI().toString(),
                        context == null ? null : context.receiverClass()), context);
    }

    public static StateRefinementErrorDTO from(StateRefinementError error) {
        return new StateRefinementErrorDTO(error);
    }
}
