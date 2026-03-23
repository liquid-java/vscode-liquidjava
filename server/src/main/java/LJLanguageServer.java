import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.eclipse.lsp4j.InitializeParams;
import org.eclipse.lsp4j.InitializeResult;
import org.eclipse.lsp4j.ServerCapabilities;
import org.eclipse.lsp4j.TextDocumentSyncKind;
import org.eclipse.lsp4j.WorkspaceFoldersOptions;
import org.eclipse.lsp4j.WorkspaceServerCapabilities;
import org.eclipse.lsp4j.jsonrpc.services.JsonNotification;
import org.eclipse.lsp4j.jsonrpc.services.JsonRequest;
import org.eclipse.lsp4j.services.LanguageServer;
import org.eclipse.lsp4j.services.TextDocumentService;
import org.eclipse.lsp4j.services.WorkspaceService;

import dtos.uri.Uri;
import fsm.StateMachine;
import fsm.StateMachineParser;

public class LJLanguageServer implements LanguageServer {

    private final LJDiagnosticsService diagnosticsService;
    private final ExecutorService stateMachineExecutor;

    public LJLanguageServer() {
        this.diagnosticsService = new LJDiagnosticsService();
        this.stateMachineExecutor = Executors.newSingleThreadExecutor(r -> {
            Thread thread = new Thread(r, "liquidjava-fsm");
            thread.setDaemon(true);
            return thread;
        });
    }

    /**
     * Initializes the language server with the given parameters
     * @param params the initialize parameters
     * @return CompletableFuture with the InitializeResult
     */
    public CompletableFuture<InitializeResult> initialize(InitializeParams params) {
        CompletableFuture<InitializeResult> completableFuture = new CompletableFuture<>();
        ServerCapabilities capabilities = new ServerCapabilities();
        WorkspaceServerCapabilities workspaceServerCapabilities = new WorkspaceServerCapabilities();
        WorkspaceFoldersOptions workspaceFoldersOptions = new WorkspaceFoldersOptions();

        // extract workspace root from initialization params
        if (params.getWorkspaceFolders() != null && !params.getWorkspaceFolders().isEmpty()) {
            String workspaceRoot = params.getWorkspaceFolders().get(0).getUri();
            diagnosticsService.setWorkspaceRoot(workspaceRoot);
        }

        // set options
        workspaceFoldersOptions.setChangeNotifications(true);
        workspaceFoldersOptions.setSupported(true);
        workspaceServerCapabilities.setWorkspaceFolders(workspaceFoldersOptions);
        capabilities.setWorkspace(workspaceServerCapabilities);
        capabilities.setDocumentSymbolProvider(false);
        capabilities.setTextDocumentSync(TextDocumentSyncKind.Full);
        capabilities.setDocumentLinkProvider(null); // new DocumentLinkOptions(true));
        // More in:
        // https://github.com/nedap/archetype-languageserver/blob/24b0890c0f046c6c1af8269a5c9770a8860a96b3/src/main/java/com/nedap/openehr/lsp/ADL2LanguageServer.java

        completableFuture.complete(new InitializeResult(capabilities));
        return completableFuture;
    }

    public CompletableFuture<Object> shutdown() {
        diagnosticsService.shutdown();
        stateMachineExecutor.shutdownNow();
        return CompletableFuture.completedFuture(null);
    }

    public void exit() {
        System.exit(1);
    }

    public TextDocumentService getTextDocumentService() {
        return diagnosticsService;
    }

    public WorkspaceService getWorkspaceService() {
        return diagnosticsService;
    }

    public void connect(LJLanguageClient client) {
        diagnosticsService.setClient(client);
    }

    @SuppressWarnings("unused")
    @JsonNotification("$/setTraceNotification")
    public void setTrace(Object params) {
        // suppress notification
    }

    @JsonRequest("liquidjava/fsm")
    public CompletableFuture<StateMachine> fsm(Uri uri) {
        return CompletableFuture.supplyAsync(() -> StateMachineParser.parse(uri.uri()), stateMachineExecutor);
    }

    @JsonNotification("liquidjava/verify")
    public void verify(Uri uri) {
        diagnosticsService.generateDiagnosticsAsync(uri.uri());
    }
}
