import java.io.File;
import java.net.URI;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
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

import liquidjava.diagnostics.LJDiagnostic;
import liquidjava.processor.context.ContextHistory;
import utils.ContextHistoryConverter;
import utils.DiagnosticConverter;
import utils.PathUtils;

public class LJDiagnosticsService implements TextDocumentService, WorkspaceService {

    private LJLanguageClient client;
    private String workspaceRoot;
    private boolean initialVerification;
    private final Set<String> publishedDiagnosticUris = new HashSet<>();
    private final ExecutorService diagnosticsExecutor = Executors.newSingleThreadExecutor(r -> {
        Thread thread = new Thread(r, "liquidjava-diagnostics");
        thread.setDaemon(true);
        return thread;
    });

    public void setClient(LJLanguageClient client) {
        this.client = client;
    }

    public void setWorkspaceRoot(String workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
    }

    /**
     * Sends diagnostics notification to the client
     * @param diagnostics the diagnostics to send
     */
    public void sendDiagnosticsNotification(List<LJDiagnostic> diagnostics) {
        if (this.client == null) return;
            
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
        String path = PathUtils.extractBasePath(uri);
        clearPublishedDiagnostics(uri);

        try {
            LJDiagnostics ljDiagnostics = LJDiagnosticsHandler.getLJDiagnostics(path);
            List<PublishDiagnosticsParams> nativeDiagnostics = LJDiagnosticsHandler.getNativeDiagnostics(ljDiagnostics, uri);
            nativeDiagnostics.forEach(params -> {
                this.client.publishDiagnostics(params);
                if (!params.getDiagnostics().isEmpty()) {
                    publishedDiagnosticUris.add(params.getUri());
                }
            });
            List<LJDiagnostic> diagnostics = Stream.concat(ljDiagnostics.errors().stream(), ljDiagnostics.warnings().stream()).collect(Collectors.toList());
            sendDiagnosticsNotification(diagnostics);
            this.client.sendContext(ContextHistoryConverter.convertToDTO(ContextHistory.getInstance()));
        } catch (Exception e) {
            System.err.println("LiquidJava internal error: " + e.getMessage());
            clearPublishedDiagnostics(uri);
            this.client.sendFailure();
        }
    }

    /**
     * Schedules diagnostics generation without blocking the LSP thread
     * @param uri the URI of the document
     * @return a future that completes when diagnostics are published
     */
    public CompletableFuture<Void> generateDiagnosticsAsync(String uri) {
        return CompletableFuture.runAsync(() -> generateDiagnostics(uri), diagnosticsExecutor);
    }

    /**
     * Stops background diagnostics work
     */
    public void shutdown() {
        diagnosticsExecutor.shutdownNow();
    }

    /**
     * Clear a diagnostic for a specific URI
     * @param uri the URI of the document
     */
    public void clearDiagnostic(String uri) {
        this.client.publishDiagnostics(LJDiagnosticsHandler.getEmptyDiagnostics(uri));
        publishedDiagnosticUris.remove(uri);
        // TODO: fix consistency between native and custom diagnostics
        // sendDiagnosticsNotification(List.of());
    }

    private void clearPublishedDiagnostics(String uri) {
        Set<String> urisToClear = new HashSet<>(publishedDiagnosticUris);
        urisToClear.add(uri);
        urisToClear.forEach(clearUri -> this.client.publishDiagnostics(LJDiagnosticsHandler.getEmptyDiagnostics(clearUri)));
        publishedDiagnosticUris.clear();
    }

    /**
     * Checks diagnostics when the first document is opened
     * @param params
     */
    @Override
    public void didOpen(DidOpenTextDocumentParams params) {
        String uri = params.getTextDocument().getUri();
        if (!PathUtils.isFileInDirectory(uri, workspaceRoot) || initialVerification) return;
        initialVerification = true;
        System.out.println("First document opened — checking diagnostics");
        generateDiagnosticsAsync(uri);
    }

    /**
     * Checks diagnostics when a document is saved
     * @param params
     */
    @Override
    public void didSave(DidSaveTextDocumentParams params) {
        String uri = params.getTextDocument().getUri();
        if (!PathUtils.isFileInDirectory(uri, workspaceRoot)) return;
        System.out.println("Document saved — checking diagnostics");
        clearDiagnostic(uri);
        generateDiagnosticsAsync(uri);
    }

    /**
     * Clears diagnostics for a deleted document
     * @param params
     */
    @Override
    public void didClose(DidCloseTextDocumentParams params) {
        String uri = params.getTextDocument().getUri();
        if (!PathUtils.isFileInDirectory(uri, workspaceRoot)) return;
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
