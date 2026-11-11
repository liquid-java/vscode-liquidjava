import java.util.List;

import liquidjava.diagnostics.errors.LJError;

/**
 * Runs the verifier on a source folder and prints every error as the extension shows it, for checking the messages
 * outside the editor: {@code java -cp language-server-liquidjava.jar BaselineLauncher <path>}
 */
public class BaselineLauncher {

    public static void main(String[] args) throws Exception {
        if (args.length != 1) {
            System.err.println("usage: BaselineLauncher <source folder>");
            System.exit(2);
        }
        List<LJError> errors = LJDiagnosticsHandler.getLJDiagnostics(args[0]).errors();
        for (LJError error : errors) {
            System.out.println("Refinement Type Error");
            System.out.println(BaselineMessages.title(error));
            System.out.print(BaselineMessages.full(error));
        }
        System.exit(errors.isEmpty() ? 0 : 1);
    }
}
