# Contributing to LiquidJava VS Code Extension

### Prerequisites

Before starting development, ensure you have:

- Java 20 or higher installed and configured in your `PATH`
- Maven 3.6 or higher for building the language server
- Node.js and npm for building and packaging the client
- Visual Studio Code and the [Language Support for Java(TM) by Red Hat](https://marketplace.visualstudio.com/items?itemName=redhat.java) extension installed and enabled

### Cloning and Setup

To get started, clone the repository and install the client dependencies:

```bash
git clone https://github.com/liquid-java/vscode-liquidjava.git
cd vscode-liquidjava
cd client
npm install
```

### Packaging and Installation

To build the language server, package the extension, and install it in your local VS Code instance, you can run the provided script from the repository root:

```bash
./install.sh
```

Use `./install.sh --skip-server` to package and install the extension without rebuilding the language server.

### Releasing

Create a version bump pull request from `main` with the release script:

```bash
./release.sh
```

By default, this bumps the patch version in [client/package.json](./client/package.json). Pass a version to set it explicitly:

```bash
./release.sh <new-version>
```

After the pull request passes Checks and is merged, create and push its release tag from `main`:

```bash
./release.sh --tag <new-version>
```

The tag runs Checks again and publishes the verified extension artifact to the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=AlcidesFonseca.liquid-java) and the [Open VSX Registry](https://open-vsx.org/extension/AlcidesFonseca/liquid-java).

### Development Mode

To run the extension in development mode, follow these steps:
1. Go to **Run** > **Run Extension** (or press **F5**)
2. A new VS Code instance will open with the extension installed, which will automatically run the language server in the background and connect to it
3. Open a Java project using LiquidJava

To run the language server manually, follow these steps:

1. Run the server in port `50000` (default)
2. In the client, set the `DEBUG` constant in [client/src/extension.ts](./client/src/extension.ts) to `true`
3. Run the client which will connect to the server in port `50000`

### Project Structure
- `/server` - Implements the language server in Java using [LSP4J](https://github.com/eclipse/lsp4j)
- `/client` - Implements the VS Code extension in TypeScript that connects to the language server via LSP

### Local study logging

Study logging is disabled by default. To enable it, add these settings to the study workspace's `.vscode/settings.json`:

```json
{
  "liquidjava.study.enabled": true,
  "liquidjava.study.participantId": "P01",
  "liquidjava.study.logPath": ".liquidjava/study-log.jsonl"
}
```

The log path is relative to the first workspace folder, which is also the folder the verifier checks. Absolute paths and paths outside that folder are rejected. Logging requires a local filesystem workspace. Changes to any study setting take effect immediately; disabling logging flushes pending events and removes study editor listeners and timers. When disabled, the extension creates no log file and performs no study writes, diagnostic hashing, or server timing notifications. The configuration listener remains active so logging can be enabled later.

Run **LiquidJava: Reveal Study Log** to flush and open the JSONL file. Each line is a JSON object with `t` (UTC ISO timestamp), `pid` (participant ID), `session` (UUID for this extension activation), `event`, and the fields below. Events use workspace-relative paths with `/` separators and **one-based** lines and columns. Logs append across launches; settings changes and server restarts retain the activation's session ID.

| Event | Fields / meaning |
| --- | --- |
| `logging_started`, `logging_stopped` | Boundaries of each enabled logging interval; includes settings changes and normal shutdown. |
| `file_opened`, `file_focused`, `file_blurred`, `file_saved` | `file`; Java files inside the workspace only. Initial focus is recorded even if the file was already open. Switching to another file, a non-Java editor, or no editor ends focus. |
| `file_edited` | `file`, `count`; number of content changes, batched after 500 ms of quiet, and flushed on save, file switch, or shutdown. No edited text is stored. |
| `window_focus`, `window_blur` | VS Code window focus, including its initial state. |
| `verify_started` | `file`, `trigger` (`open`, `save`, `manual`), `run`; emitted when the server begins a queued verification. Run IDs remain unique after server restarts. |
| `verify_finished` | Same fields plus `durationMs` and `result` (`passed`, `failed`, `crashed`, `cancelled`). Duration excludes queue wait. Stopping the server or logging cancels pending runs; cancellations use elapsed client time. |
| `diagnostic_shown`, `diagnostic_resolved` | `file`, `line`, `column` (null if unavailable), `kind` (the diagnostic type), `category`, `key`. Repeated results do not repeat appearances. Only successful diagnostic results resolve previous errors; crashes and stops do not. |
| `view_visible`, `view_hidden` | LiquidJava sidebar visibility, including initial state when logging is enabled. |
| `tab_selected` | `tab` (`diagnostics`, `context`, `fsm`), `file` when available; includes initial selection and diagnostic context / state-machine actions. |
| `section_toggled` | `section` (`context-vars`, `context-ghosts`, `context-aliases`), `expanded`, `file`. |
| `section_shown` | `section` (`counterexample`, `vc-implications`, `hint`), `file`; these sections currently render without collapse controls. Records transitions into the rendered view; redraws of continuously visible sections are deduplicated. |
| `vc_step_selected` | `direction` (`previous`, `next`), `file`; records simplification steps, including the displayed changes between implications. |
| `diagnostic_reveal` | `file`, `line`, `column`; navigation from the webview to source. |
| `highlight` | `file`, `line`, `active` for same-file highlights; cross-file navigation also records its highlight. |
| `clipboard_copy` | `target` (`diagnostic`, `fsm`), `file`; emitted after a successful copy, without clipboard contents. |
| `hover_shown` | `file`, `line`, `column`; LiquidJava supplied a nonempty hover (VS Code does not expose whether it was ultimately displayed). |
| `codelens_clicked` | `file`, `line`; diagnostic CodeLens activation. |
| `command_run` | `command`; registered `liquidjava.*` commands, including Reveal Study Log. |

To compute time focused per exercise, intersect `file_focused`/`file_blurred` intervals with `window_focus`/`window_blur` and `logging_started`/`logging_stopped` intervals. Edits and saves provide activity counts; the analysis can choose its own idle threshold. Match diagnostic appearances and resolutions using `key` to compute observed time-to-fix. Keys preserve the nearest previous diagnostic of the same file, kind, and category when edits move its line, which suits the study's one intended error per exercise. Multiple identical errors are matched by proximity; replacing one with another of the same kind may retain its key. An abrupt process exit has no reliable end event: treat the final interval as incomplete rather than assuming it ended at a later launch.

No source code, expressions, diagnostic messages, counterexamples, hover contents, or clipboard text are logged. Nothing is uploaded, and the VS Code telemetry API is not used. Participants can inspect the file and hand it in themselves. Keep `.liquidjava/` out of the study repository's `.gitignore` if collecting with git. AI explanation events are deferred until the explanation UI in issue #113 exists.
