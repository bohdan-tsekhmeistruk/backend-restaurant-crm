import type { PrismaClient } from "src/generated/prisma/client.js";
import {
  ProductSelect,
  TSearchProductsQuery,
  type TProductResponse,
  type TCreateProductBody,
  type TUpdateProductBody,
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

  /**
   * Create a product
   * @param {PrismaClient} prisma - The Prisma client
   * @param {TCreateProductBody} body - The product data
   * @returns {Promise<TProductResponse>} - The created product
   */
  async createProduct(
    prisma: PrismaClient,
    body: TCreateProductBody,
  ): Promise<TProductResponse> {
    const category = await prisma.productCategory.findUnique({
      where: { id: body.categoryId },
      select: { id: true },
    });
    if (!category) {
      throw errorHandler.httpError(404, "Category not found");
    }

    const product = await prisma.product.create({
      data: body,
      select: ProductSelect,
    });

    return product;
  }

  /**
   * Update a product
   * @param {PrismaClient} prisma - The Prisma client
   * @param {string} id - The id of the product
   * @param {TUpdateProductBody} body - The product data
   * @returns {Promise<TProductResponse>} - The updated product
   */
  async updateProduct(
    prisma: PrismaClient,
    id: string,
    body: TUpdateProductBody,
  ): Promise<TProductResponse> {
    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!product) {
      throw errorHandler.httpError(404, "Product not found");
    }

    if (body.categoryId) {
      const category = await prisma.productCategory.findUnique({
        where: { id: body.categoryId },
        select: { id: true },
      });
      if (!category) {
        throw errorHandler.httpError(404, "Category not found");
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: body,
      select: ProductSelect,
    });

    return updatedProduct;
  }

  /**
   * Delete a product
   * @param {PrismaClient} prisma - The Prisma client
   * @param {string} id - The id of the product
   * @returns {Promise<void>} - Return void if success
   */
  async deleteProduct(prisma: PrismaClient, id: string): Promise<void> {
    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        _count: { select: { cartItems: true, orderItems: true } },
      },
    });
    if (!product) {
      throw errorHandler.httpError(404, "Product not found");
    }

    if (product._count.cartItems > 0) {
      throw errorHandler.httpError(400, "Cannot delete product in carts");
    }

    if (product._count.orderItems > 0) {
      throw errorHandler.httpError(400, "Cannot delete product in orders");
    }

    await prisma.product.delete({
      where: { id },
    });

    return;
  }
}

export default new ProductsService();
