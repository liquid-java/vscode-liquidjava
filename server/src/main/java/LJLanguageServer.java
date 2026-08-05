import java.util.concurrent.CompletableFuture;

import org.eclipse.lsp4j.InitializeParams;
import org.eclipse.lsp4j.InitializeResult;
import org.eclipse.lsp4j.ServerCapabilities;
import org.eclipse.lsp4j.TextDocumentSyncKind;
import org.eclipse.lsp4j.WorkspaceFoldersOptions;
import org.eclipse.lsp4j.WorkspaceServerCapabilities;
import org.eclipse.lsp4j.services.LanguageServer;
import org.eclipse.lsp4j.services.TextDocumentService;
import org.eclipse.lsp4j.services.WorkspaceService;

public class LJLanguageServer implements LanguageServer {

    private final LJDiagnosticsService diagnosticsService;

    public LJLanguageServer() {
        this.diagnosticsService = new LJDiagnosticsService();
    }

    @Override
    public CompletableFuture<InitializeResult> initialize(InitializeParams params) {
        ServerCapabilities capabilities = new ServerCapabilities();
        WorkspaceFoldersOptions workspaceFoldersOptions = new WorkspaceFoldersOptions();
        WorkspaceServerCapabilities workspaceCapabilities = new WorkspaceServerCapabilities();

        if (params.getWorkspaceFolders() != null && !params.getWorkspaceFolders().isEmpty()) {
            diagnosticsService.setWorkspaceRoot(params.getWorkspaceFolders().get(0).getUri());
        }

        workspaceFoldersOptions.setChangeNotifications(true);
        workspaceFoldersOptions.setSupported(true);
        workspaceCapabilities.setWorkspaceFolders(workspaceFoldersOptions);
        capabilities.setWorkspace(workspaceCapabilities);
        capabilities.setDocumentSymbolProvider(false);
        capabilities.setTextDocumentSync(TextDocumentSyncKind.Full);
        return CompletableFuture.completedFuture(new InitializeResult(capabilities));
    }

    @Override
    public CompletableFuture<Object> shutdown() {
        diagnosticsService.shutdown();
        return CompletableFuture.completedFuture(null);
    }

    @Override
    public void exit() {
        System.exit(1);
    }

    @Override
    public TextDocumentService getTextDocumentService() {
        return diagnosticsService;
    }

    @Override
    public WorkspaceService getWorkspaceService() {
        return diagnosticsService;
    }

    public void connect(LJLanguageClient client) {
        diagnosticsService.setClient(client);
    }
}
