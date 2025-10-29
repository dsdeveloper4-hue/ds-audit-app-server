// server.ts
import "module-alias/register";
import app from "./app";
import { Server } from "http";
import config from "./app/config";

async function main(): Promise<void> {
  const server: Server = app.listen(config.port, () => {
    console.log(`Server is running at http://localhost:${config.port}`);
  });

  const exitHandler = (): void => {
    if (server) {
      server.close(() => {
        console.info("Server closed!");
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  };

  process.on("uncaughtException", (error: Error) => {
    console.error("Uncaught Exception:", error);
    exitHandler();
  });

  process.on("unhandledRejection", (reason: unknown) => {
    console.error("Unhandled Rejection:", reason);
    exitHandler();
  });
}

main().catch((error) => {
  console.error("Error starting server:", error);
  process.exit(1);
});
