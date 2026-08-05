import type { PrismaClient } from "src/generated/prisma/client.js";
import {
  CategorySelect,
  TSearchCategoriesQuery,
  type TCategoryResponse,
  type TCreateCategoryBody,
  type TUpdateCategoryBody,
} from "./dto/categories.dto.js";
import errorHandler from "src/lib/error.handler.js";

class CategoriesService {
  /**
   * Search for categories
   * @param {PrismaClient} prisma - The Prisma client
   * @param {TSearchCategoriesQuery} query - The query object
   * @returns {Promise<TCategoryResponse[]>} - The categories
   */
  async searchCategories(
    prisma: PrismaClient,
    query: TSearchCategoriesQuery,
  ): Promise<TCategoryResponse[]> {
    const categories = await prisma.productCategory.findMany({
      where: {
        ...(query.name && {
          name: { contains: query.name, mode: "insensitive" },
        }),
        ...(query.parentId && { parentId: query.parentId }),
      },
      take: query.limit,
      skip: (query.page - 1) * query.limit,
      select: CategorySelect,
    });
    return categories;
  }

  /**
   * Get a category by id
   * @param {PrismaClient} prisma - The Prisma client
   * @param {string} id - The id of the category
   * @returns {Promise<TCategoryResponse>} - The category
   */
  async getCategoryById(
    prisma: PrismaClient,
    id: string,
  ): Promise<TCategoryResponse> {
    const category = await prisma.productCategory.findUnique({
      where: {
        id,
      },
      select: CategorySelect,
    });

    if (!category) {
      throw errorHandler.httpError(404, "Category not found");
    }

    return category;
  }

  /**
   * Create a category
   * @param {PrismaClient} prisma - The Prisma client
   * @param {TCreateCategoryBody} body - The category data
   * @returns {Promise<TCategoryResponse>} - The created category
   */
  async createCategory(
    prisma: PrismaClient,
    body: TCreateCategoryBody,
  ): Promise<TCategoryResponse> {
    if (body.parentId) {
      const parent = await prisma.productCategory.findUnique({
        where: { id: body.parentId },
        select: { id: true },
      });
      if (!parent) {
        throw errorHandler.httpError(404, "Parent category not found");
      }
    }

    const category = await prisma.productCategory.create({
      data: body,
      select: CategorySelect,
    });

    return category;
  }

  /**
   * Update a category
   * @param {PrismaClient} prisma - The Prisma client
   * @param {string} id - The id of the category
   * @param {TUpdateCategoryBody} body - The category data
   * @returns {Promise<TCategoryResponse>} - The updated category
   */
  async updateCategory(
    prisma: PrismaClient,
    id: string,
    body: TUpdateCategoryBody,
  ): Promise<TCategoryResponse> {
    const category = await prisma.productCategory.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!category) {
      throw errorHandler.httpError(404, "Category not found");
    }

    if (body.parentId) {
      if (body.parentId === id) {
        throw errorHandler.httpError(400, "Category cannot be its own parent");
      }

      const parent = await prisma.productCategory.findUnique({
        where: { id: body.parentId },
        select: { id: true },
      });
      if (!parent) {
        throw errorHandler.httpError(404, "Parent category not found");
      }
    }

    const updatedCategory = await prisma.productCategory.update({
      where: { id },
      data: body,
      select: CategorySelect,
    });

    return updatedCategory;
  }

  /**
   * Delete a category
   * @param {PrismaClient} prisma - The Prisma client
   * @param {string} id - The id of the category
   * @returns {Promise<void>} - Return void if success
   */
  async deleteCategory(prisma: PrismaClient, id: string): Promise<void> {
    const category = await prisma.productCategory.findUnique({
      where: { id },
      select: {
        id: true,
        _count: { select: { products: true } },
      },
    });
    if (!category) {
      throw errorHandler.httpError(404, "Category not found");
    }

    if (category._count.products > 0) {
      throw errorHandler.httpError(400, "Cannot delete category with products");
    }

    await prisma.productCategory.delete({
      where: { id },
    });

    return;
  }
}

export default new CategoriesService();
