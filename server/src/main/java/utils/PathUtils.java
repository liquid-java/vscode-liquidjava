package utils;

import java.net.URI;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Utility class for path operations
 */
public class PathUtils {
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
     * @param fileUri the file URI
     * @return base path
     */
    public static String extractBasePath(String fileUri) {
        Path fullPath = Paths.get(URI.create(fileUri));
        for (int i = 0; i < fullPath.getNameCount() - 1; i++) {
            if (fullPath.getName(i).toString().equals("src")) {
                Path basePath = fullPath.subpath(0, i + 2);
                return fullPath.getRoot() == null
                        ? basePath.toString()
                        : fullPath.getRoot().resolve(basePath).toString();
            }
        }
        return fullPath.toString();
    }

    /**
     * Converts a file path to a file:// URI
     * @param filePath the file path
     * @return the file URI
     */
    public static String toFileUri(String filePath) {
        if (filePath == null) return "";
        return Paths.get(filePath).toUri().toString();
    }
}
