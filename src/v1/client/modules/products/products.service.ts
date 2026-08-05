import type { PrismaClient } from "src/generated/prisma/client.js";
import {
  ProductSelect,
  TSearchProductsQuery,
  type TProductResponse,
} from "./dto/products.dto.js";
import errorHandler from "src/lib/error.handler.js";

class ProductsService {
  /**
   * Search for products
   * @param {PrismaClient} prisma - The Prisma client
   * @param {TSearchProductsQuery} query - The query object
   * @returns {Promise<TProductResponse[]>} - The products
   */
  async searchProducts(
    prisma: PrismaClient,
    query: TSearchProductsQuery,
  ): Promise<TProductResponse[]> {
    const products = await prisma.product.findMany({
      where: {
        ...(query.name && {
          name: { contains: query.name, mode: "insensitive" },
        }),
        ...(query.categoryId && { categoryId: query.categoryId }),
        ...(query.isAvailable !== undefined && {
          isAvailable: query.isAvailable,
        }),
      },
      take: query.limit,
      skip: (query.page - 1) * query.limit,
      select: ProductSelect,
    });
    return products;
  }

  /**
   * Get a product by id
   * @param {PrismaClient} prisma - The Prisma client
   * @param {string} id - The id of the product
   * @returns {Promise<TProductResponse>} - The product
   */
  async getProductById(
    prisma: PrismaClient,
    id: string,
  ): Promise<TProductResponse> {
    const product = await prisma.product.findUnique({
      where: {
        id,
      },
      select: ProductSelect,
    });

    if (!product) {
      throw errorHandler.httpError(404, "Product not found");
    }

    return product;
  }
}

export default new ProductsService();
