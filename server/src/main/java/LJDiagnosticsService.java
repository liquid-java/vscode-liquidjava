import java.io.File;
import java.net.URI;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.eclipse.lsp4j.DidChangeConfigurationParams;
import org.eclipse.lsp4j.DidChangeTextDocumentParams;
import org.eclipse.lsp4j.DidChangeWatchedFilesParams;
import org.eclipse.lsp4j.DidCloseTextDocumentParams;
import org.eclipse.lsp4j.DidOpenTextDocumentParams;
import org.eclipse.lsp4j.DidSaveTextDocumentParams;
import org.eclipse.lsp4j.PublishDiagnosticsParams;
import org.eclipse.lsp4j.services.TextDocumentService;
import org.eclipse.lsp4j.services.WorkspaceService;

import dtos.DiagnosticConverter;
import liquidjava.diagnostics.LJDiagnostic;

public class LJDiagnosticsService implements TextDocumentService, WorkspaceService {

    private LJLanguageClient client;
    private String sourcePath;

    /**
     * Sets the language client
     * @param client the language client
     */
    public void setClient(LJLanguageClient client) {
        this.client = client;
    }

    /**
     * Sets the source path
     * Uses workspaceRoot + "/src/main/java" if it exists, otherwise uses workspaceRoot
     * @param workspaceRoot the workspace root URI
     */
    public void setSourcePath(String workspaceRoot) {
        Path workspaceRootPath = Paths.get(URI.create(workspaceRoot));
        Path srcMainJava = workspaceRootPath.resolve("src/main/java");
        this.sourcePath = srcMainJava.toFile().isDirectory() ? srcMainJava.toString() : workspaceRootPath.toString();
    }

    /**
     * Sends diagnostics notification to the client
     * @param diagnostics the diagnostics to send
     */
    public void sendDiagnosticsNotification(List<LJDiagnostic> diagnostics) {
        if (this.client == null)
            return;
            
        System.out.println("Sending diagnostics notification with " + diagnostics.size() + " diagnostics");
        List<Object> dtos = diagnostics.stream()
            .map(DiagnosticConverter::convertToDTO)
            .collect(Collectors.toList());
        this.client.sendDiagnostics(dtos);
    }

    /**
     * Generates diagnostics for the given URI and publishes them to the client
     * @param uri the URI of the document
     */
    public void generateDiagnostics(String uri) {
        LJDiagnostics ljDiagnostics = LJDiagnosticsHandler.getLJDiagnostics(uri, sourcePath);
        List<PublishDiagnosticsParams> nativeDiagnostics = LJDiagnosticsHandler.getNativeDiagnostics(ljDiagnostics, uri);
        nativeDiagnostics.forEach(params -> {
            this.client.publishDiagnostics(params);
        });
        List<LJDiagnostic> diagnostics = Stream.concat(ljDiagnostics.errors().stream(), ljDiagnostics.warnings().stream()).collect(Collectors.toList());
        sendDiagnosticsNotification(diagnostics);
    }

    /**
     * Checks if a file URI is within the source path
     * @param uri the file URI
     * @return true if the file is within sourcePath, false otherwise
     */
    private boolean isFileInSourcePath(String uri) {
        try {
            Path filePath = Paths.get(new URI(uri));
            Path sourcePathObj = Paths.get(sourcePath);
            return filePath.startsWith(sourcePathObj);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Clear a diagnostic for a specific URI
     * @param uri the URI of the document
     */
    public void clearDiagnostic(String uri) {
        this.client.publishDiagnostics(LJDiagnosticsHandler.getEmptyDiagnostics(uri));
        // TODO: fix consistency between native and custom diagnostics
        // sendDiagnosticsNotification(List.of());
    }

    /**
     * Checks diagnostics when a document is opened
     * @param params
     */
    @Override
    public void didOpen(DidOpenTextDocumentParams params) {
        String uri = params.getTextDocument().getUri();
        if (!isFileInSourcePath(uri)) return;
        System.out.println("Document opened — checking diagnostics");
        generateDiagnostics(uri);
    }

    /**
     * Checks diagnostics when a document is saved
     * @param params
     */
    @Override
    public void didSave(DidSaveTextDocumentParams params) {
        String uri = params.getTextDocument().getUri();
        if (!isFileInSourcePath(uri)) return;
        System.out.println("Document saved — checking diagnostics");
        clearDiagnostic(uri);
        generateDiagnostics(uri);
    }

    /**
     * Clears diagnostics for a deleted document
     * @param params
     */
    @Override
    public void didClose(DidCloseTextDocumentParams params) {
        String uri = params.getTextDocument().getUri();
        if (!isFileInSourcePath(uri)) return;
        try {
            // check if the file still exists on disk
            File file = new File(new URI(uri));
            if (!file.exists()) {
                System.out.println("File deleted — clearing diagnostic");
                clearDiagnostic(uri);
            }
        } catch (Exception e) {}
    }

    @Override
    public void didChange(DidChangeTextDocumentParams params) {
        // do nothing, diagnostics are checked on save to avoid excessive checks
    }

    @Override
    public void didChangeConfiguration(DidChangeConfigurationParams params) {
        // do nothing, ignore
    }

    @Override
    public void didChangeWatchedFiles(DidChangeWatchedFilesParams params) {
        // do nothing, ignore
    }
}