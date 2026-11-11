package utils;

import static org.junit.jupiter.api.Assertions.*;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import dtos.context.ContextHistoryDTO;
import dtos.context.GhostDTO;
import dtos.context.VariableDTO;
import dtos.diagnostics.PlacementInCodeDTO;
import dtos.diagnostics.SourcePositionDTO;
import liquidjava.api.CommandLineLauncher;
import liquidjava.processor.context.ContextHistory;
import liquidjava.processor.context.Variable;
import liquidjava.rj_language.Predicate;
import spoon.Launcher;

class ContextHistoryConverterTest {
    private static final Path DOOR = Path.of("src", "test", "resources", "context").toAbsolutePath();
    private final ContextHistory history = ContextHistory.getInstance();

    private ContextHistoryDTO verify(Path path) {
        boolean lspMode = CommandLineLauncher.cmdArgs.lspMode;
        CommandLineLauncher.cmdArgs.lspMode = true; // the verifier only keeps its context history in the IDE
        try {
            CommandLineLauncher.launch(path.toString());
        } finally {
            CommandLineLauncher.cmdArgs.lspMode = lspMode;
        }
        return ContextHistoryConverter.convertToDTO(history);
    }

    @BeforeEach
    @AfterEach
    void clearHistory() {
        history.clearHistory();
    }

    @Test
    void convertsEmptyHistoryToEmptyCollections() {
        ContextHistoryDTO dto = ContextHistoryConverter.convertToDTO(history);
        assertTrue(dto.localVars().isEmpty());
        assertTrue(dto.globalVars().isEmpty());
        assertTrue(dto.ghosts().isEmpty());
        assertTrue(dto.aliases().isEmpty());
        assertTrue(dto.methods().isEmpty());
        assertTrue(dto.fileScopes().isEmpty());
    }

    @Test
    void convertsScopesPerFileWithoutDependingOnSetOrder() {
        history.getFileScopes().put("Example.java", Set.of("2:5-4:18", "1:1-1:1"));
        history.getFileScopes().put("Other.java", Set.of("8:3-9:12"));
        ContextHistoryDTO dto = ContextHistoryConverter.convertToDTO(history);
        assertEquals(Set.of("Example.java", "Other.java"), dto.fileScopes().keySet());
        assertEquals(Set.of(new SourcePositionDTO(null, 1, 4, 3, 18), new SourcePositionDTO(null, 0, 0, 0, 1)),
                Set.copyOf(dto.fileScopes().get("Example.java")));
        assertEquals(List.of(new SourcePositionDTO(null, 7, 2, 8, 12)), dto.fileScopes().get("Other.java"));
    }

    @Test
    void omitsVariablesWithoutCodePlacement() {
        Variable generated = new Variable("generated", new Launcher().getFactory().Type().INTEGER_PRIMITIVE,
                new Predicate());
        history.getLocalVars().add(generated);
        history.getGlobalVars().add(generated);
        ContextHistoryDTO dto = ContextHistoryConverter.convertToDTO(history);
        assertTrue(dto.localVars().isEmpty());
        assertTrue(dto.globalVars().isEmpty());
    }

    @Test
    void showsVariablesAsErrorMessagesDo() {
        List<VariableDTO> variables = verify(DOOR).localVars();
        Map<String, String> refinements = variables.stream()
                .collect(Collectors.toMap(VariableDTO::displayName, VariableDTO::refinement, (left, right) -> left));
        assertEquals("phase(door@13) == open", refinements.get("door@13"));
        assertEquals("door == door@13", refinements.get("door"));
        // the array length the verifier introduces is replaced by its value
        assertEquals("length(keys@14) == 2", refinements.get("keys@14"));
        assertTrue(variables.stream().noneMatch(v -> v.displayName().startsWith("#")), refinements.toString());
    }

    @Test
    void sendsWhereTheValuesTheVerifierIntroducesComeFrom() {
        PlacementInCodeDTO length = verify(DOOR).generatedPlaces().get("#array_length");
        assertEquals("2", length.text());
        assertEquals(13, length.position().lineStart()); // new int[2], from line zero
    }

    @Test
    void showsTheStatesOfANamedSetAsValuesOfTheSet() {
        List<GhostDTO> ghosts = verify(DOOR).ghosts();
        assertEquals(List.of("open", "closed"), ghosts.stream().map(GhostDTO::name).toList());
        assertTrue(ghosts.stream().allMatch(g -> g.isState() && "phase".equals(g.stateSet())));
    }
}
