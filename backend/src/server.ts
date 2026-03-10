import app from "./app";
import { env } from "./config/env";
import prisma from "./lib/prisma";
import { createScheduler } from "./scheduler";

export async function startServer(): Promise<void> {
  await prisma.$connect();

  const scheduler = createScheduler();
  scheduler.start();

  const server = app.listen(env.port, () => {
    console.log(`Server listening on port ${env.port}`);
    console.log(`Environment: ${env.nodeEnv}`);
  });

  const shutdown = async () => {
    scheduler.stop();
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

