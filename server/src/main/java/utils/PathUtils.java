package utils;

import java.net.URI;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Utility class for path operations
 */
public class PathUtils {
    private static final String FILE_PREFIX = "file://";
    private static final String SRC_SUFFIX = "/src/";

    /**
     * Checks if a file is in a given directory
     * @param fileUri the file URI
     * @param directoryUri the directory URI
     * @return true if the file is in the directory, false otherwise
     */
    public static boolean isFileInDirectory(String fileUri, String directoryUri) {
        try {
            Path filePath = Paths.get(new URI(fileUri));
            Path directoryPath = Paths.get(new URI(directoryUri));
            return filePath.startsWith(directoryPath);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Extracts the base path from the given full path
     * e.g. file://path/to/project/src/main/path/to/File.java => /path/to/project/src/main
     * @param fullPath the full path
     * @return base path
     */
    public static String extractBasePath(String fullPath) {
        fullPath = fullPath.replace(FILE_PREFIX, "");
        int suffixIndex = fullPath.indexOf(SRC_SUFFIX);
        int nextSlashIndex = fullPath.indexOf("/", suffixIndex + SRC_SUFFIX.length());
        if (suffixIndex == -1 || nextSlashIndex == -1)
            return fullPath; // cannot extract base path
        return fullPath.substring(0, nextSlashIndex); // up to and including the next slash after /src/
    }

    /**
     * Converts a file path to a file:// URI
     * @param filePath the file path
     * @return the file URI
     */
    public static String toFileUri(String filePath) {
        String normalized = filePath.replace("\\", "/");
        // Windows (C:/path)
        if (!normalized.isEmpty() && normalized.charAt(1) == ':') {
            return FILE_PREFIX + "/" + normalized;
        }
        // Unix (/path)
        return FILE_PREFIX + normalized;
    }
}
