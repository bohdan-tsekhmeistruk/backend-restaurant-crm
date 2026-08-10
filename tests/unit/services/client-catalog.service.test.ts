import { beforeEach, describe, expect, it } from "vitest";
import categoriesService from "src/v1/client/modules/categories/categories.service.js";
import productsService from "src/v1/client/modules/products/products.service.js";
import {
  asPrisma,
  createPrismaMock,
  type PrismaMock,
} from "../../helpers/prisma-mock.js";
import { expectHttpError } from "../../helpers/assert.js";
import { TEST_UUID } from "../../helpers/http.js";

describe("Client CategoriesService", () => {
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = createPrismaMock();
  });

  describe("searchCategories", () => {
    it("queries without filters when none are given", async () => {
      prisma.productCategory.findMany.mockResolvedValue([]);

      const result = await categoriesService.searchCategories(asPrisma(prisma), {
        page: 1,
        limit: 20,
      });

      expect(result).toEqual([]);
      expect(prisma.productCategory.findMany).toHaveBeenCalledWith({
        where: {},
        take: 20,
        skip: 0,
        select: expect.objectContaining({ id: true }),
      });
    });

    it("applies a case-insensitive name filter and pagination", async () => {
      prisma.productCategory.findMany.mockResolvedValue([{ id: "c1" }]);

      await categoriesService.searchCategories(asPrisma(prisma), {
        name: "Pizza",
        parentId: TEST_UUID.category,
        page: 3,
        limit: 10,
      });

      expect(prisma.productCategory.findMany).toHaveBeenCalledWith({
        where: {
          name: { contains: "Pizza", mode: "insensitive" },
          parentId: TEST_UUID.category,
        },
        take: 10,
        skip: 20,
        select: expect.anything(),
      });
    });
  });

  describe("getCategoryById", () => {
    it("returns the category when found", async () => {
      const category = { id: TEST_UUID.category, name: "Pizza" };
      prisma.productCategory.findUnique.mockResolvedValue(category);

      await expect(
        categoriesService.getCategoryById(asPrisma(prisma), TEST_UUID.category),
      ).resolves.toEqual(category);
    });

    it("throws 404 when the category does not exist", async () => {
      prisma.productCategory.findUnique.mockResolvedValue(null);

      await expectHttpError(
        categoriesService.getCategoryById(asPrisma(prisma), TEST_UUID.missing),
        404,
        "Category not found",
      );
    });
  });
});

describe("Client ProductsService", () => {
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = createPrismaMock();
  });

  describe("searchProducts", () => {
    it("combines name, category and availability filters", async () => {
      prisma.product.findMany.mockResolvedValue([{ id: "p1" }]);

      const result = await productsService.searchProducts(asPrisma(prisma), {
        name: "cola",
        categoryId: TEST_UUID.category,
        isAvailable: false,
        page: 2,
        limit: 5,
      });

      expect(result).toEqual([{ id: "p1" }]);
      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: {
          name: { contains: "cola", mode: "insensitive" },
          categoryId: TEST_UUID.category,
          isAvailable: false,
        },
        take: 5,
        skip: 5,
        select: expect.anything(),
      });
    });

    it("omits the availability filter when it is undefined", async () => {
      prisma.product.findMany.mockResolvedValue([]);

      await productsService.searchProducts(asPrisma(prisma), {
        page: 1,
        limit: 20,
      });

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: {},
        take: 20,
        skip: 0,
        select: expect.anything(),
      });
    });
  });

  describe("getProductById", () => {
    it("returns the product when found", async () => {
      const product = { id: TEST_UUID.product, name: "Pizza" };
      prisma.product.findUnique.mockResolvedValue(product);

      await expect(
        productsService.getProductById(asPrisma(prisma), TEST_UUID.product),
      ).resolves.toEqual(product);
    });

    it("throws 404 when the product does not exist", async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expectHttpError(
        productsService.getProductById(asPrisma(prisma), TEST_UUID.missing),
        404,
        "Product not found",
      );
    });
  });
});
