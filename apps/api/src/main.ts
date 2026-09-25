import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

const envPath = path.resolve(
  fileURLToPath(new URL("../../../.env", import.meta.url)),
);

if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

console.log(`[GVP API] cwd=${process.cwd()} envFile=${envPath} envFileExists=${existsSync(envPath)}`);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:3000" });
  app.setGlobalPrefix("api");
  await app.listen(Number(process.env.API_PORT ?? 4000));
}

void bootstrap();
