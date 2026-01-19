import winston from "winston";
import path from "path";

export const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.printf((info) => {
            const { timestamp, level, message, ...meta } = info;

            return `${timestamp} [${level}]: ${message}${Object.keys(meta).length ? ` ${JSON.stringify(meta, null, 2)}` : ""
                }`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: path.join("logs", "app.log") })
    ]
});
