package utils;

import static org.junit.jupiter.api.Assertions.*;

import java.io.File;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class PathUtilsTest {
    @TempDir
    Path workspace;

    @Test
    void extractsSourceFolderAtDifferentDepths() {
        for (String parent : new String[] { "", "project", "projects/example/module" }) {
            Path sourceRoot = workspace.resolve(parent).resolve("src/main");
            assertEquals(sourceRoot.toString(),
                    PathUtils.extractBasePath(sourceRoot.resolve("java/Example.java").toUri().toString()));
        }
    }

    @Test
    void usesFirstSourceFolderAndOneFollowingSegment() {
        Path sourceRoot = workspace.resolve("src/generated");
        assertEquals(sourceRoot.toString(),
                PathUtils.extractBasePath(sourceRoot.resolve("src/main/Example.java").toUri().toString()));
    }

    @Test
    void retainsFullPathWithoutSourceFolder() {
        Path file = workspace.resolve("sources/Example.java");
        assertEquals(file.toString(), PathUtils.extractBasePath(file.toUri().toString()));
    }

    @Test
    void retainsPathEndingAtSourceFolder() {
        Path source = workspace.resolve("src");
        assertEquals(source.toString(), PathUtils.extractBasePath(source.toUri().toString()));
    }

    @Test
    void decodesEscapedSourcePath() {
        Path source = workspace.resolve("project with spaces/src/main");
        assertEquals(source.toString(),
                PathUtils.extractBasePath(source.resolve("Example.java").toUri().toString()));
    }

    @Test
    void handlesWindowsDriveUrisUsingHostPathSemantics() {
        // a windows file uri has a drive root on windows, and /C:/ on unix.
        String source = File.separatorChar == '\\' ? "C:\\Users\\user\\project\\src\\main"
                : "/C:/Users/user/project/src/main";
        assertEquals(source, PathUtils.extractBasePath("file:///C:/Users/user/project/src/main/java/Example.java"));
        assertTrue(PathUtils.isFileInDirectory("file:///C:/Users/user/project/src/main/java/Example.java",
                "file:///C:/Users/user/project"));
        assertFalse(PathUtils.isFileInDirectory("file:///D:/Users/user/project/Example.java",
                "file:///C:/Users/user/project"));
    }

    @Test
    void matchesDirectorySegmentsRatherThanStringPrefixes() {
        Path directory = workspace.resolve("project");
        assertTrue(PathUtils.isFileInDirectory(directory.resolve("src/main/Example.java").toUri().toString(),
                directory.toUri().toString()));
        assertFalse(PathUtils.isFileInDirectory(workspace.resolve("project-other/Example.java").toUri().toString(),
                directory.toUri().toString()));
        assertFalse(PathUtils.isFileInDirectory(workspace.resolve("Elsewhere.java").toUri().toString(),
                directory.toUri().toString()));
    }

    @Test
    void rejectsInvalidAndNonFileUrisForDirectoryMembership() {
        String directory = workspace.toUri().toString();
        for (String invalid : new String[] { null, "not a uri", "https://example.com/Example.java", "file://host/path" }) {
            assertFalse(PathUtils.isFileInDirectory(invalid, directory));
            assertFalse(PathUtils.isFileInDirectory(directory, invalid));
        }
    }

    @Test
    void convertsFilePathsToEscapedUris() {
        Path file = workspace.resolve("project with spaces/Example.java");
        String uri = PathUtils.toFileUri(file.toString());
        assertTrue(uri.startsWith("file:"));
        assertTrue(uri.contains("project%20with%20spaces"));
        assertEquals(file, Path.of(java.net.URI.create(uri)));
    }

    @Test
    void convertsNullPathToEmptyUri() {
        assertEquals("", PathUtils.toFileUri(null));
    }
}
