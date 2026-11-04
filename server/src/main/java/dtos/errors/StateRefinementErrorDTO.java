package dtos.errors;

import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;

import dtos.diagnostics.SourcePositionDTO;
import dtos.diagnostics.VCSimplificationResultDTO;
import dtos.fsm.StateMachineDTO;
import liquidjava.diagnostics.errors.StateErrorContext;
import liquidjava.diagnostics.errors.StateRefinementError;
import liquidjava.fsm.StateMachine;
import liquidjava.fsm.StateMachineParser;
import liquidjava.processor.context.ContextHistory;
import liquidjava.processor.context.GhostState;
import liquidjava.processor.context.RefinedFunction;
import liquidjava.rj_language.ast.formatter.ExpressionFormatter;
import utils.PathUtils;

/**
 * DTO for serializing StateRefinementError instances to JSON
 */
public class StateRefinementErrorDTO extends LJErrorDTO {

    public final String expected;
    public final VCSimplificationResultDTO found;
    public final String customMessage;
    public final SourcePositionDTO declarationPosition;
    public final List<StateMachineDTO> stateMachines;

    public StateRefinementErrorDTO(StateRefinementError error) {
        super("state-refinement-error", error);
        this.expected = error.getExpected() == null ? null : ExpressionFormatter.format(error.getExpected());
        this.found = VCSimplificationResultDTO.from(error.getFoundSimplification());
        this.customMessage = error.getCustomMessage();
        this.declarationPosition = SourcePositionDTO.from(error.getDeclarationPosition());
        this.stateMachines = declarationPosition == null || declarationPosition.file() == null ? List.of()
                : stateMachines(declarationPosition.file(), specFiles(), error.getContext());
    }

    public static StateRefinementErrorDTO from(StateRefinementError error) {
        return new StateRefinementErrorDTO(error);
    }

    /**
     * The diagrams of the receiver's class, which may inherit the state sets and methods of its supertypes' specs
     * @param declarationFile the file of the spec of the called method
     * @param specFiles the files of the other specs, where those of the supertypes may be
     * @param context the state error, or null if the verifier gives no states, in which case the diagrams are those of
     *                the first class of the declaration's file
     */
    static List<StateMachineDTO> stateMachines(String declarationFile, Collection<String> specFiles,
            StateErrorContext context) {
        String declarationUri = PathUtils.toFileUri(declarationFile);
        List<StateMachine> sms = context == null ? StateMachineParser.parseAll(declarationUri)
                : StateMachineParser.parseAll(Stream.concat(Stream.of(declarationUri),
                        specFiles.stream().map(PathUtils::toFileUri)).toList(), context.receiverClass());
        return StateMachineDTO.from(sms, context);
    }

    /** The files of the state sets and state refinements of the last verification */
    static List<String> specFiles() {
        ContextHistory history = ContextHistory.getInstance();
        Stream<String> stateSets = history.getGhosts().stream().map(GhostState::getFile);
        Stream<String> stateRefinements = history.getMethods().stream().filter(RefinedFunction::hasStateChange)
                .map(method -> SourcePositionDTO.from(method.getPlacementInCode().getPosition()))
                .filter(Objects::nonNull).map(SourcePositionDTO::file);
        return Stream.concat(stateSets, stateRefinements).filter(Objects::nonNull).distinct().toList();
    }
}
