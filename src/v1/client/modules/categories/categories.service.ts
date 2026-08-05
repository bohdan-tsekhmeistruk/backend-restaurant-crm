import type { PrismaClient } from "src/generated/prisma/client.js";
import {
  CategorySelect,
  TSearchCategoriesQuery,
  type TCategoryResponse,
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
}

export default new CategoriesService();
