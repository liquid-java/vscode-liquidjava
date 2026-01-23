import { OutputChannel } from "vscode";

enum LogLevel {
    INFO = "INFO",
    ERROR = "ERROR",
}

enum LogSource {
    CLIENT = "CLIENT",
    SERVER = "SERVER",
}

/**
 * Logs a message to the specified output channel
 * @param channel The output channel to log to
 * @param msg The message to log
 * @param level The log level
 * @param source The log source
 * @returns 
 */
function logMessage(channel: OutputChannel, msg: string, level: LogLevel, source: LogSource) {
    if (!channel) return;
    const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
    channel.appendLine(`${timestamp} [${source}] [${level}] ${msg}`);
}

export type LiquidJavaLogger = {
    client: {
        info: (msg: string) => void;
        error: (msg: string) => void;
    };
    server: {
        info: (msg: string) => void;
        error: (msg: string) => void;
    };
    dispose: () => void;
};

/**
 * Creates a logger for the LiquidJava extension
 * @param channel The output channel to log to
 * @returns A LiquidJavaLogger instance with client and server log methods
 */
export function createLogger(channel: OutputChannel): LiquidJavaLogger {
    let disposed = false;

    const log = (channel: OutputChannel, msg: string, level: LogLevel, source: LogSource) => {
        if (disposed) {
            // channel was disposed, fallback to console.log
            console.log(msg);
            return;
        }
        logMessage(channel, msg, level, source);
    }

    return {
        client: {
            info: msg => log(channel, msg, LogLevel.INFO, LogSource.CLIENT),
            error: msg => log(channel, msg, LogLevel.ERROR, LogSource.CLIENT),
        },
        server: {
            info: msg => log(channel, msg, LogLevel.INFO, LogSource.SERVER),
            error: msg => log(channel, msg, LogLevel.ERROR, LogSource.SERVER),
        },
        dispose: () => disposed = true,
    };
}
