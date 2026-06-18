import { createLogger as winstonCreateLogger, transports, format } from "winston";

const LOG_LEVEL = process.env.LOG_LEVEL ?? "info";

export function createLogger(label: string) {
  return winstonCreateLogger({
    level: LOG_LEVEL,
    format: format.combine(
      format.label({ label }),
      format.colorize(),
      format.printf(({ level, message, label: l }) => `[${l}] ${level}: ${message}`)
    ),
    transports: [new transports.Console()],
  });
}
