import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

// serialize batches so shutdown and configuration changes cannot reorder events
export class StudyWriter {
    private lines: string[] = [];
    private timer?: ReturnType<typeof setTimeout>;
    private writes: Promise<void>;

    constructor(readonly path: string, private readonly pid: string, readonly session: string, private readonly onError: () => void, previousWrites = Promise.resolve()) {
        this.writes = previousWrites;
    }

    log(event: string, data: object = {}) {
        this.lines.push(JSON.stringify({ ...data, t: new Date().toISOString(), pid: this.pid, session: this.session, event }) + '\n');
        if (!this.timer) this.timer = setTimeout(() => { void this.flush(); }, 250);
    }

    flush(): Promise<void> {
        clearTimeout(this.timer);
        this.timer = undefined;
        if (this.lines.length) {
            const batch = this.lines.join('');
            this.lines = [];
            this.writes = this.writes.then(async () => {
                await mkdir(dirname(this.path), { recursive: true });
                await appendFile(this.path, batch, 'utf8');
            }).catch(this.onError);
        }
        return this.writes;
    }
}
