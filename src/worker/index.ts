import { createWorker } from "./processor";

const worker = createWorker();

console.log("Worker started, waiting for jobs...");

async function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down...`);
  await worker.close();
  console.log("Worker shut down gracefully");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
