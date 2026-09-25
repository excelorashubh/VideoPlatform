import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { ProcessingWorker } from "./modules/processing/processing.worker.js";

const envPath = path.resolve(
  fileURLToPath(new URL("../../../.env", import.meta.url)),
);

if (existsSync(envPath)) process.loadEnvFile(envPath);

const context = await NestFactory.createApplicationContext(AppModule);
const worker = context.get(ProcessingWorker);

const shutdown = async () => {
  await context.close();
  process.exit(0);
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

await worker.run();