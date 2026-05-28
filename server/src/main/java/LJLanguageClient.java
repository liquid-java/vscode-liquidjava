import java.util.List;

import org.eclipse.lsp4j.services.LanguageClient;

import dtos.context.ContextHistoryDTO;

import org.eclipse.lsp4j.jsonrpc.services.JsonNotification;

/**
 * Language client interface to specify custom notifications
 */
public interface LJLanguageClient extends LanguageClient {
    
    /**
     * Sends custom diagnostics notification to the client
     * @param diagnostics the LiquidJava diagnostics to send
     */
    @JsonNotification("liquidjava/diagnostics")
    void sendDiagnostics(List<Object> diagnostics);

    /**
     * Sends a verifier failure notification to the client
     */
    @JsonNotification("liquidjava/failure")
    void sendFailure();

    /**
     * Sends the context history to the client
     * @param contextHistory the context history to send
     */
    @JsonNotification("liquidjava/context")
    void sendContext(ContextHistoryDTO contextHistory);
}
