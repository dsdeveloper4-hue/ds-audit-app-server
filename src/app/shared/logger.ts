import pino from "pino";
import chalk from "chalk";

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  transport:
    process.env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
            ignore: "pid,hostname",
            singleLine: true,
          },
        }
      : undefined,
});

// Helper to get the calling location of the Prisma query
const getCallsite = () => {
  const stack = new Error().stack;
  if (!stack) return "N/A";

  const lines = stack.split("\n");

  // Find the first line outside node_modules/internal
  const appLine = lines.find(
    (line) =>
      !line.includes("node_modules") &&
      !line.includes("internal") &&
      !line.includes("pino")
  );

  return appLine ? appLine.trim() : "N/A";
};

// Helper to prettify Prisma query
export const formatPrismaQuery = (
  query: string,
  params: string,
  duration: string
) => {
  // Extract main SQL operation
  const operationMatch = query.match(/^(SELECT|INSERT|UPDATE|DELETE|COMMIT)/i);
  const operation = operationMatch ? operationMatch[1].toUpperCase() : "QUERY";

  // Extract table name
  const tableMatch = query.match(/FROM\s+"public"\."(\w+)"/i);
  const table = tableMatch ? tableMatch[1] : "N/A";

  // Shorten query for readability
  let shortQuery = query.replace(/\s+/g, " ").trim();
  if (shortQuery.length > 100) shortQuery = shortQuery.slice(0, 100) + "...";

  // Highlight slow queries > 100ms
  const isSlow = parseInt(duration) > 100;

  // Get callsite info
const callsite = getCallsite();
return `${chalk.cyan(operation)} on ${chalk.yellow(table)} | ${chalk.green(
  duration
)} | ${chalk.white(shortQuery)} | params: ${chalk.magenta(params)}${
  isSlow ? chalk.red(" ⚠️ SLOW") : ""
}${callsite !== "N/A" ? ` | ${chalk.gray(callsite)}` : ""}`;

};

export default logger;
