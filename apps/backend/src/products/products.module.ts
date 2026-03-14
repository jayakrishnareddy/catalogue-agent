import { Module } from "@nestjs/common";
import { ProductsService } from "./products.service";
import { ProductsController } from "./products.controller";
import { GoogleVisionService } from "../integrations/google-vision.service";
import { GeminiService } from "../integrations/gemini.service";

@Module({
  providers: [ProductsService, GoogleVisionService, GeminiService],
  controllers: [ProductsController],
})
export class ProductsModule {}
