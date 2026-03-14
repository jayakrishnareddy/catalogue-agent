import "reflect-metadata";
import { config } from "dotenv";

config({ path: "../../.env.local" });
import { NestFactory } from "@nestjs/core";
import express from "express";
import { join } from "path";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  const httpAdapter = app.getHttpAdapter();
  const instance = httpAdapter.getInstance() as express.Express;
  instance.use("/uploads", express.static(join(process.cwd(), "uploads")));

  app.setGlobalPrefix("api");
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 4000);
}

bootstrap();
