type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
import fs from 'fs';
import path from 'path';

let fileLogPath: string | null = null;

export const configureFileLogging = (logPath: string, truncate: boolean = false) => {
  const logDir = path.dirname(logPath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  fileLogPath = logPath;
  if (truncate) {
    fs.writeFileSync(fileLogPath, '', 'utf-8');
  }
};

class Logger {
  private readonly scope: string;

  constructor(scope: string) {
    this.scope = scope;
  }

  private format(level: LogLevel, message: string) {
    const ts = new Date().toISOString();
    return `[${ts}] [${level}] [${this.scope}] ${message}`;
  }

  private writeToFile(line: string) {
    if (!fileLogPath) return;
    fs.appendFileSync(fileLogPath, `${line}\n`, 'utf-8');
  }

  debug(message: string) {
    const line = this.format('DEBUG', message);
    console.log(line);
    this.writeToFile(line);
  }

  info(message: string) {
    const line = this.format('INFO', message);
    console.log(line);
    this.writeToFile(line);
  }

  warn(message: string) {
    const line = this.format('WARN', message);
    console.warn(line);
    this.writeToFile(line);
  }

  error(message: string, error?: unknown) {
    const line = this.format('ERROR', message);
    if (error) {
      console.error(line, error);
      this.writeToFile(`${line} ${String(error)}`);
      return;
    }
    console.error(line);
    this.writeToFile(line);
  }
}

export const createLogger = (scope: string) => new Logger(scope);
