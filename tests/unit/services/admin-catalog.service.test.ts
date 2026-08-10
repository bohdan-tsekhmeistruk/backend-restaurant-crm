import { beforeEach, describe, expect, it } from "vitest";
import categoriesService from "src/v1/admin/modules/categories/categories.service.js";
import productsService from "src/v1/admin/modules/products/products.service.js";
import {
  asPrisma,
  createPrismaMock,
  type PrismaMock,
} from "../../helpers/prisma-mock.js";
import { expectHttpError } from "../../helpers/assert.js";
import { TEST_UUID } from "../../helpers/http.js";

describe("Admin CategoriesService", () => {
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = createPrismaMock();
  });

  describe("searchCategories / getCategoryById", () => {
    it("searches with filters and pagination", async () => {
      prisma.productCategory.findMany.mockResolvedValue([]);

      await categoriesService.searchCategories(asPrisma(prisma), {
        name: "pizza",
        page: 2,
        limit: 10,
      });

      expect(prisma.productCategory.findMany).toHaveBeenCalledWith({
        where: { name: { contains: "pizza", mode: "insensitive" } },
        take: 10,
        skip: 10,
        select: expect.anything(),
      });
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

  describe("createCategory", () => {
    it("creates a root category without checking the parent", async () => {
      const category = { id: TEST_UUID.category, name: "Pizza" };
      prisma.productCategory.create.mockResolvedValue(category);

      const result = await categoriesService.createCategory(asPrisma(prisma), {
        name: "Pizza",
      });

      expect(result).toEqual(category);
      expect(prisma.productCategory.findUnique).not.toHaveBeenCalled();
      expect(prisma.productCategory.create).toHaveBeenCalledWith({
        data: { name: "Pizza" },
        select: expect.anything(),
      });
    });

    it("throws 404 when the parent category does not exist", async () => {
      prisma.productCategory.findUnique.mockResolvedValue(null);

      await expectHttpError(
        categoriesService.createCategory(asPrisma(prisma), {
          name: "Calzone",
          parentId: TEST_UUID.missing,
        }),
        404,
        "Parent category not found",
      );
      expect(prisma.productCategory.create).not.toHaveBeenCalled();
    });

    it("creates a child category when the parent exists", async () => {
      prisma.productCategory.findUnique.mockResolvedValue({
        id: TEST_UUID.category,
      });
      prisma.productCategory.create.mockResolvedValue({ id: "child" });

      await categoriesService.createCategory(asPrisma(prisma), {
        name: "Calzone",
        parentId: TEST_UUID.category,
      });

      expect(prisma.productCategory.create).toHaveBeenCalledWith({
        data: { name: "Calzone", parentId: TEST_UUID.category },
        select: expect.anything(),
      });
    });
  });

  describe("updateCategory", () => {
    it("throws 404 when the category does not exist", async () => {
      prisma.productCategory.findUnique.mockResolvedValue(null);

      await expectHttpError(
        categoriesService.updateCategory(asPrisma(prisma), TEST_UUID.missing, {
          name: "x",
        }),
        404,
        "Category not found",
      );
    });

    it("rejects making a category its own parent", async () => {
      prisma.productCategory.findUnique.mockResolvedValue({
        id: TEST_UUID.category,
      });

      await expectHttpError(
        categoriesService.updateCategory(asPrisma(prisma), TEST_UUID.category, {
          parentId: TEST_UUID.category,
        }),
        400,
        "Category cannot be its own parent",
      );
    });

    it("throws 404 when the new parent does not exist", async () => {
      prisma.productCategory.findUnique
        .mockResolvedValueOnce({ id: TEST_UUID.category })
        .mockResolvedValueOnce(null);

      await expectHttpError(
        categoriesService.updateCategory(asPrisma(prisma), TEST_UUID.category, {
          parentId: TEST_UUID.missing,
        }),
        404,
        "Parent category not found",
      );
    });

    it("updates the category when all checks pass", async () => {
      prisma.productCategory.findUnique.mockResolvedValue({
        id: TEST_UUID.category,
      });
      prisma.productCategory.update.mockResolvedValue({
        id: TEST_UUID.category,
        name: "New name",
      });

      const result = await categoriesService.updateCategory(
        asPrisma(prisma),
        TEST_UUID.category,
        { name: "New name" },
      );

      expect(result.name).toBe("New name");
      expect(prisma.productCategory.update).toHaveBeenCalledWith({
        where: { id: TEST_UUID.category },
        data: { name: "New name" },
        select: expect.anything(),
      });
    });
  });

  describe("deleteCategory", () => {
    it("throws 404 when the category does not exist", async () => {
      prisma.productCategory.findUnique.mockResolvedValue(null);

      await expectHttpError(
        categoriesService.deleteCategory(asPrisma(prisma), TEST_UUID.missing),
        404,
        "Category not found",
      );
    });

    it("rejects deleting a category that still has products", async () => {
      prisma.productCategory.findUnique.mockResolvedValue({
        id: TEST_UUID.category,
        _count: { products: 3 },
      });

      await expectHttpError(
        categoriesService.deleteCategory(asPrisma(prisma), TEST_UUID.category),
        400,
        "Cannot delete category with products",
      );
      expect(prisma.productCategory.delete).not.toHaveBeenCalled();
    });

    it("deletes an empty category", async () => {
      prisma.productCategory.findUnique.mockResolvedValue({
        id: TEST_UUID.category,
        _count: { products: 0 },
      });
      prisma.productCategory.delete.mockResolvedValue({});

      await categoriesService.deleteCategory(asPrisma(prisma), TEST_UUID.category);

      expect(prisma.productCategory.delete).toHaveBeenCalledWith({
        where: { id: TEST_UUID.category },
      });
    });
  });
});

describe("Admin ProductsService", () => {
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = createPrismaMock();
  });

  describe("searchProducts / getProductById", () => {
    it("searches with all filters", async () => {
      prisma.product.findMany.mockResolvedValue([]);

      await productsService.searchProducts(asPrisma(prisma), {
        name: "pizza",
        categoryId: TEST_UUID.category,
        isAvailable: true,
        page: 1,
        limit: 20,
      });

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: {
          name: { contains: "pizza", mode: "insensitive" },
          categoryId: TEST_UUID.category,
          isAvailable: true,
        },
        take: 20,
        skip: 0,
        select: expect.anything(),
      });
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

  describe("createProduct", () => {
    const body = {
      name: "Pizza",
      description: "Tasty",
      price: 9.99,
      categoryId: TEST_UUID.category,
    };

    it("throws 404 when the category does not exist", async () => {
      prisma.productCategory.findUnique.mockResolvedValue(null);

      await expectHttpError(
        productsService.createProduct(asPrisma(prisma), body),
        404,
        "Category not found",
      );
      expect(prisma.product.create).not.toHaveBeenCalled();
    });

    it("creates the product when the category exists", async () => {
      prisma.productCategory.findUnique.mockResolvedValue({
        id: TEST_UUID.category,
      });
      prisma.product.create.mockResolvedValue({ id: TEST_UUID.product });

      await productsService.createProduct(asPrisma(prisma), body);

      expect(prisma.product.create).toHaveBeenCalledWith({
        data: body,
        select: expect.anything(),
      });
    });
  });

  describe("updateProduct", () => {
    it("throws 404 when the product does not exist", async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expectHttpError(
        productsService.updateProduct(asPrisma(prisma), TEST_UUID.missing, {
          name: "x",
        }),
        404,
        "Product not found",
      );
    });

    it("validates the new category when categoryId is provided", async () => {
      prisma.product.findUnique.mockResolvedValue({ id: TEST_UUID.product });
      prisma.productCategory.findUnique.mockResolvedValue(null);

      await expectHttpError(
        productsService.updateProduct(asPrisma(prisma), TEST_UUID.product, {
          categoryId: TEST_UUID.missing,
        }),
        404,
        "Category not found",
      );
      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it("skips the category check when categoryId is not provided", async () => {
      prisma.product.findUnique.mockResolvedValue({ id: TEST_UUID.product });
      prisma.product.update.mockResolvedValue({ id: TEST_UUID.product });

      await productsService.updateProduct(asPrisma(prisma), TEST_UUID.product, {
        price: 12.5,
      });

      expect(prisma.productCategory.findUnique).not.toHaveBeenCalled();
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: TEST_UUID.product },
        data: { price: 12.5 },
        select: expect.anything(),
      });
    });
  });

  describe("deleteProduct", () => {
    it("throws 404 when the product does not exist", async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expectHttpError(
        productsService.deleteProduct(asPrisma(prisma), TEST_UUID.missing),
        404,
        "Product not found",
      );
    });

    it("rejects deletion while the product is in some cart", async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: TEST_UUID.product,
        _count: { cartItems: 1, orderItems: 0 },
      });

      await expectHttpError(
        productsService.deleteProduct(asPrisma(prisma), TEST_UUID.product),
        400,
        "Cannot delete product in carts",
      );
      expect(prisma.product.delete).not.toHaveBeenCalled();
    });

    it("rejects deletion while the product is in some order", async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: TEST_UUID.product,
        _count: { cartItems: 0, orderItems: 2 },
      });

      await expectHttpError(
        productsService.deleteProduct(asPrisma(prisma), TEST_UUID.product),
        400,
        "Cannot delete product in orders",
      );
    });

    it("deletes an unreferenced product", async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: TEST_UUID.product,
        _count: { cartItems: 0, orderItems: 0 },
      });
      prisma.product.delete.mockResolvedValue({});

      await productsService.deleteProduct(asPrisma(prisma), TEST_UUID.product);

      expect(prisma.product.delete).toHaveBeenCalledWith({
        where: { id: TEST_UUID.product },
      });
    });
  });
});
