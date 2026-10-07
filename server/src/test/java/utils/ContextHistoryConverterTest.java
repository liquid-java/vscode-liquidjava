package utils;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import dtos.context.ContextHistoryDTO;
import dtos.diagnostics.SourcePositionDTO;
import liquidjava.processor.context.ContextHistory;
import liquidjava.processor.context.Variable;
import liquidjava.rj_language.Predicate;
import spoon.Launcher;

class ContextHistoryConverterTest {
    private final ContextHistory history = ContextHistory.getInstance();

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
}
