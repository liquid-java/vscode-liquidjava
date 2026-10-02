package dtos.diagnostics;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

import spoon.reflect.cu.SourcePosition;

class SourcePositionDTOTest {
    @Test
    void convertsStringRangeToZeroBasedLinesAndExclusiveEndColumn() {
        assertEquals(new SourcePositionDTO(null, 1, 4, 3, 18), SourcePositionDTO.from("2:5-4:18"));
        assertEquals(new SourcePositionDTO(null, 0, 0, 0, 1), SourcePositionDTO.from("1:1-1:1"));
    }

    @Test
    void rejectsMalformedRanges() {
        for (String invalid : new String[] { "", "2:5", "2:5-4", " 2:5-4:18", "2:a-4:18", "prefix 2:5-4:18" }) {
            assertNull(SourcePositionDTO.from(invalid));
        }
    }

    @Test
    void toleratesMissingAndUnavailablePositions() {
        assertNull(SourcePositionDTO.from((String) null));
        assertNull(SourcePositionDTO.from((SourcePosition) null));
        assertNull(SourcePositionDTO.from(SourcePosition.NOPOSITION));
    }
}
