import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    FATAL = 4
}

export type LogFormat = 'text' | 'json';

export interface LoggerTransport {
    log(level: LogLevel, message: string, meta?: any): void;
}

export class ConsoleTransport implements LoggerTransport {
    constructor(private format: LogFormat = 'text') {}

    log(level: LogLevel, message: string, meta?: any): void {
        const timestamp = new Date().toISOString();
        const levelName = LogLevel[level];

        if (this.format === 'json') {
            const logEntry = {
                timestamp,
                level: levelName,
                message,
                ...(meta && { meta })
            };
            const out = JSON.stringify(logEntry);
            if (level >= LogLevel.ERROR) {
                console.error(out);
            } else {
                console.log(out);
            }
        } else {
            let out = `[${timestamp}] [${levelName}] ${message}`;
            if (meta) {
                if (meta instanceof Error) {
                    out += `\n${meta.stack}`;
                } else if (typeof meta === 'object') {
                    out += ` ${JSON.stringify(meta)}`;
                } else {
                    out += ` ${meta}`;
                }
            }
            if (level >= LogLevel.ERROR) {
                console.error(out);
            } else {
                console.log(out);
            }
        }
    }
}

export class FileTransport implements LoggerTransport {
    private filePath: string;
    
    constructor(filePath: string, private format: LogFormat = 'text') {
        this.filePath = path.resolve(process.cwd(), filePath);
        // Ensure directory exists
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    log(level: LogLevel, message: string, meta?: any): void {
        const timestamp = new Date().toISOString();
        const levelName = LogLevel[level];
        let out = '';

        if (this.format === 'json') {
            const logEntry = {
                timestamp,
                level: levelName,
                message,
                ...(meta && { meta })
            };
            out = JSON.stringify(logEntry) + '\n';
        } else {
            out = `[${timestamp}] [${levelName}] ${message}`;
            if (meta) {
                if (meta instanceof Error) {
                    out += `\n${meta.stack}`;
                } else if (typeof meta === 'object') {
                    out += ` ${JSON.stringify(meta)}`;
                } else {
                    out += ` ${meta}`;
                }
            }
            out += '\n';
        }

        try {
            fs.appendFileSync(this.filePath, out, 'utf8');
        } catch (err) {
            console.error(`[Logger] Failed to write to log file ${this.filePath}`, err);
        }
    }
}

export class Logger {
    private transports: LoggerTransport[] = [];
    private level: LogLevel = LogLevel.INFO;

    constructor(level: LogLevel = LogLevel.INFO) {
        this.level = level;
    }

    addTransport(transport: LoggerTransport): void {
        this.transports.push(transport);
    }

    setLevel(level: LogLevel): void {
        this.level = level;
    }

    private log(level: LogLevel, message: string, meta?: any): void {
        if (level < this.level) {
            return;
        }

        for (const transport of this.transports) {
            try {
                transport.log(level, message, meta);
            } catch (err) {
                // Fallback safe logging if transport fails
                console.error(`[Logger] Transport log failed:`, err);
            }
        }
    }

    debug(message: string, meta?: any): void {
        this.log(LogLevel.DEBUG, message, meta);
    }

    info(message: string, meta?: any): void {
        this.log(LogLevel.INFO, message, meta);
    }

    warn(message: string, meta?: any): void {
        this.log(LogLevel.WARN, message, meta);
    }

    error(message: string, meta?: any): void {
        this.log(LogLevel.ERROR, message, meta);
    }

    fatal(message: string, meta?: any): void {
        this.log(LogLevel.FATAL, message, meta);
    }
}

// Global default logger
export const appLogger = new Logger(LogLevel.DEBUG);
appLogger.addTransport(new ConsoleTransport('text'));
