import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { ProductsService } from "./products.service";

@Controller("shops/:shopId/products")
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(@Param("shopId") shopId: string) {
    return this.products.listByShop(shopId);
  }

  @Post("from-images")
  @UseInterceptors(FilesInterceptor("images"))
  async createFromImages(
    @Param("shopId") shopId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.products.createDraftsFromImages(shopId, files);
  }

  @Patch(":productId")
  updateProduct(
    @Param("shopId") shopId: string,
    @Param("productId") productId: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      category?: string;
      price?: number;
      inStock?: boolean;
      imageUrl?: string;
    },
  ) {
    return this.products.updateProduct(shopId, productId, body);
  }

  @Delete(":productId")
  async deleteProduct(
    @Param("shopId") shopId: string,
    @Param("productId") productId: string,
  ) {
    await this.products.deleteProduct(shopId, productId);
    return { success: true };
  }

  @Post("reorder")
  reorder(
    @Param("shopId") shopId: string,
    @Body() body: { id: string; toIndex: number },
  ) {
    return this.products.reorderProducts(shopId, body.id, body.toIndex);
  }
}
