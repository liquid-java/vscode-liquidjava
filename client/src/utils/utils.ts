import * as fs from "fs";
import * as path from "path";
import * as net from "net";
import * as child_process from "child_process";
import { JAVA_BINARY } from "./constants";

/**
 * Finds the Java executable in the system, either in JAVA_HOME or in PATH
 * MIT Licensed code from: https://github.com/georgewfraser/vscode-javac
 */
export function findJavaExecutable(): string | null {
    const binname = process.platform === "win32" ? `${JAVA_BINARY}.exe` : JAVA_BINARY;

    // First search each JAVA_HOME bin folder
    if (process.env["JAVA_HOME"]) {
        for (const workspace of process.env["JAVA_HOME"].split(path.delimiter)) {
            const binpath = path.join(workspace, "bin", binname);
            if (fs.existsSync(binpath)) return binpath;
        }
    }
    // Then search PATH parts
    if (process.env["PATH"]) {
        for (const part of process.env["PATH"].split(path.delimiter)) {
            const binpath = path.join(part, binname);
            if (fs.existsSync(binpath)) return binpath;
        }
    }
    // Else return null
    return null;
}

/**
 * Gets an available port in the OS
 * @returns A promise to the available port number
 */
export async function getAvailablePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(0, "localhost", () => {
            const port = (server.address() as net.AddressInfo).port;
            server.close();
            resolve(port);
        });
        server.on("error", reject);
    });
}

/**
 * Connects to the process on the given port, retrying until timeout
 * @param port The port to connect to
 * @param timeout The timeout duration in milliseconds
 * @param attemptInterval The interval between connection attempts in milliseconds
 * @param connectionTimeout The timeout for each individual connection attempt in milliseconds
 * @returns A promise to the connected socket
 */
export async function connectToPort(
    port: number,
    timeout = 10000,
    attemptInterval = 500,
    connectionTimeout = 500
): Promise<net.Socket> {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        try {
            return await new Promise((resolve, reject) => {
                const s = net.connect({ port });

                // connection timeout
                const t = setTimeout(() => {
                    s.destroy(new Error("connection timeout"));
                    reject(new Error("connection timeout"));
                }, connectionTimeout);

                // success
                s.once("connect", () => {
                    clearTimeout(t);
                    resolve(s);
                });

                // failure
                s.once("error", (e) => {
                    clearTimeout(t);
                    reject(e);
                });
            });
        } catch {
            // wait and retry
            await new Promise((r) => setTimeout(r, attemptInterval));
        }
    }
    throw new Error(`Server not reachable on port ${port} within ${timeout}ms`);
}

/**
 * Kills the given process if it is running
 * @param proc The process to kill
 * @returns A promise that resolves when the process has been killed
 */
export async function killProcess(proc?: child_process.ChildProcess) {
    return new Promise<void>((resolve, reject) => {
        if (!proc || proc.killed) {
            // already killed
            resolve();
            return;
        }
        if (process.platform === "win32") {
            // Windows
            child_process.exec(`taskkill /pid ${proc.pid} /T /F`, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        } else {
            // Unix
            try {
                process.kill(proc.pid, "SIGKILL");
                resolve();
            } catch (err) {
                reject(err);
            }
        }
    });
}
