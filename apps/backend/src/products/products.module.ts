import { Module } from "@nestjs/common";
import { ProductsService } from "./products.service";
import { ProductsController } from "./products.controller";
import { OpenAIService } from "../integrations/openai.service";

@Module({
  providers: [ProductsService, OpenAIService],
  controllers: [ProductsController],
})
export class ProductsModule {}
