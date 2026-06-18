"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
const winston_1 = require("winston");
const LOG_LEVEL = process.env.LOG_LEVEL ?? "info";
function createLogger(label) {
    return (0, winston_1.createLogger)({
        level: LOG_LEVEL,
        format: winston_1.format.combine(winston_1.format.label({ label }), winston_1.format.colorize(), winston_1.format.printf(({ level, message, label: l }) => `[${l}] ${level}: ${message}`)),
        transports: [new winston_1.transports.Console()],
    });
}
//# sourceMappingURL=logger.js.map