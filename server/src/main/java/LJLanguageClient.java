import org.eclipse.lsp4j.jsonrpc.services.JsonNotification;
import org.eclipse.lsp4j.services.LanguageClient;

import dtos.Status;

/**
 * Standard LSP client used to publish verifier errors, plus the outcome of each run for the status bar.
 */
public interface LJLanguageClient extends LanguageClient {

    @JsonNotification("liquidjava/status")
    void sendStatus(Status status);
}
