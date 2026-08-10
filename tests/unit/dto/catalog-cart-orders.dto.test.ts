import { describe, expect, it } from "vitest";
import {
  TAddCartItemBody,
  TCartItemIdParam,
  TUpdateCartItemBody,
} from "src/v1/client/modules/cart/dto/cart.dto.js";
import { TSearchCategoriesQuery as TClientSearchCategoriesQuery } from "src/v1/client/modules/categories/dto/categories.dto.js";
import { TSearchProductsQuery as TClientSearchProductsQuery } from "src/v1/client/modules/products/dto/products.dto.js";
import {
  TCancelOrderBody,
  TGetOrderByIdParam,
  TSearchOrdersQuery as TClientSearchOrdersQuery,
} from "src/v1/client/modules/orders/dto/orders.dto.js";
import {
  TCreateProductBody,
  TSearchProductsQuery as TAdminSearchProductsQuery,
  TUpdateProductBody,
} from "src/v1/admin/modules/products/dto/products.dto.js";
import {
  TCreateCategoryBody,
  TSearchCategoriesQuery as TAdminSearchCategoriesQuery,
  TUpdateCategoryBody,
} from "src/v1/admin/modules/categories/dto/categories.dto.js";
import {
  TAddUserCartItemBody,
  TCartItemParams,
  TUpdateUserCartItemBody,
  TUserIdParam,
} from "src/v1/admin/modules/cart/dto/cart.dto.js";
import {
  TCreateOrderBody,
  TSearchOrdersQuery as TAdminSearchOrdersQuery,
  TUpdateOrderBody,
} from "src/v1/admin/modules/orders/dto/orders.dto.js";
import {
  TGetUserByIdParam,
  TSearchUsersQuery,
  TUpdateUserBody,
} from "src/v1/admin/modules/users/dto/users.dto.js";
import { TEST_UUID } from "../../helpers/http.js";

describe("search query DTOs", () => {
  it.each([
    ["client categories", TClientSearchCategoriesQuery],
    ["client products", TClientSearchProductsQuery],
    ["client orders", TClientSearchOrdersQuery],
    ["admin categories", TAdminSearchCategoriesQuery],
    ["admin products", TAdminSearchProductsQuery],
    ["admin orders", TAdminSearchOrdersQuery],
    ["admin users", TSearchUsersQuery],
  ])("%s: applies page/limit defaults", (_label, schema: any) => {
    expect(schema.parse({})).toMatchObject({ page: 1, limit: 20 });
  });

  it("coerces string page/limit from the query string", () => {
    const parsed = TClientSearchProductsQuery.parse({ page: "3", limit: "50" });
    expect(parsed).toMatchObject({ page: 3, limit: 50 });
  });

  it("rejects out-of-range pagination", () => {
    expect(() => TClientSearchOrdersQuery.parse({ page: 0 })).toThrow();
    expect(() => TClientSearchOrdersQuery.parse({ limit: 101 })).toThrow();
  });

  it("parses isAvailable as a string boolean", () => {
    expect(
      TClientSearchProductsQuery.parse({ isAvailable: "true" }).isAvailable,
    ).toBe(true);
    expect(
      TClientSearchProductsQuery.parse({ isAvailable: "false" }).isAvailable,
    ).toBe(false);
    expect(() =>
      TClientSearchProductsQuery.parse({ isAvailable: "maybe" }),
    ).toThrow();
  });

  it("validates uuid filters", () => {
    expect(() =>
      TClientSearchCategoriesQuery.parse({ parentId: "not-a-uuid" }),
    ).toThrow();
    expect(
      TAdminSearchOrdersQuery.parse({ userId: TEST_UUID.user }).userId,
    ).toBe(TEST_UUID.user);
  });

  it("TSearchUsersQuery accepts role and status enums", () => {
    const parsed = TSearchUsersQuery.parse({ role: "ADMIN", status: "BLOCKED" });
    expect(parsed).toMatchObject({ role: "ADMIN", status: "BLOCKED" });
    expect(() => TSearchUsersQuery.parse({ role: "ROOT" })).toThrow();
    expect(() => TSearchUsersQuery.parse({ status: "ARCHIVED" })).toThrow();
  });
});

describe("param DTOs", () => {
  it.each([
    ["TCartItemIdParam", TCartItemIdParam, { id: TEST_UUID.cartItem }],
    ["TGetOrderByIdParam", TGetOrderByIdParam, { id: TEST_UUID.order }],
    ["TUserIdParam", TUserIdParam, { userId: TEST_UUID.user }],
    [
      "TCartItemParams",
      TCartItemParams,
      { userId: TEST_UUID.user, itemId: TEST_UUID.cartItem },
    ],
    ["TGetUserByIdParam", TGetUserByIdParam, { id: TEST_UUID.user }],
  ])("%s accepts valid uuids", (_label, schema: any, value) => {
    expect(schema.parse(value)).toEqual(value);
  });

  it.each([
    ["TCartItemIdParam", TCartItemIdParam, { id: "x" }],
    ["TGetOrderByIdParam", TGetOrderByIdParam, { id: "x" }],
    ["TUserIdParam", TUserIdParam, { userId: "x" }],
    ["TCartItemParams", TCartItemParams, { userId: "x", itemId: "y" }],
    ["TGetUserByIdParam", TGetUserByIdParam, { id: "x" }],
  ])("%s rejects invalid uuids", (_label, schema: any, value) => {
    expect(() => schema.parse(value)).toThrow();
  });
});

describe("cart DTOs", () => {
  it("TAddCartItemBody defaults quantity to 1", () => {
    expect(TAddCartItemBody.parse({ productId: TEST_UUID.product })).toEqual({
      productId: TEST_UUID.product,
      quantity: 1,
    });
  });

  it.each([
    [TAddCartItemBody, { productId: TEST_UUID.product }],
    [TAddUserCartItemBody, { productId: TEST_UUID.product }],
  ])("rejects out-of-range quantities", (schema: any, base) => {
    expect(() => schema.parse({ ...base, quantity: 0 })).toThrow();
    expect(() => schema.parse({ ...base, quantity: 100 })).toThrow();
    expect(() => schema.parse({ ...base, quantity: 2.5 })).toThrow();
    expect(schema.parse({ ...base, quantity: 99 })).toMatchObject({
      quantity: 99,
    });
  });

  it("TUpdateCartItemBody requires a quantity", () => {
    expect(() => TUpdateCartItemBody.parse({})).toThrow();
    expect(TUpdateCartItemBody.parse({ quantity: 5 })).toEqual({ quantity: 5 });
  });

  it("TUpdateUserCartItemBody allows changing product and/or quantity", () => {
    expect(TUpdateUserCartItemBody.parse({})).toEqual({});
    expect(
      TUpdateUserCartItemBody.parse({ productId: TEST_UUID.product }),
    ).toEqual({ productId: TEST_UUID.product });
  });
});

describe("order DTOs", () => {
  it("TCancelOrderBody only accepts the literal CANCELLED status", () => {
    expect(TCancelOrderBody.parse({ status: "CANCELLED" })).toEqual({
      status: "CANCELLED",
    });
    expect(() => TCancelOrderBody.parse({ status: "PENDING" })).toThrow();
  });

  it("TUpdateOrderBody accepts any order status", () => {
    expect(TUpdateOrderBody.parse({ status: "DELIVERING" })).toEqual({
      status: "DELIVERING",
    });
    expect(() => TUpdateOrderBody.parse({ status: "WRONG" })).toThrow();
  });

  it("TCreateOrderBody rejects empty items and duplicate products", () => {
    expect(() =>
      TCreateOrderBody.parse({ userId: TEST_UUID.user, items: [] }),
    ).toThrow();

    expect(() =>
      TCreateOrderBody.parse({
        userId: TEST_UUID.user,
        items: [
          { productId: TEST_UUID.product, quantity: 1 },
          { productId: TEST_UUID.product, quantity: 2 },
        ],
      }),
    ).toThrow(/[Dd]uplicate/);
  });

  it("TCreateOrderBody accepts a valid order", () => {
    const body = {
      userId: TEST_UUID.user,
      items: [
        { productId: TEST_UUID.product, quantity: 1 },
        { productId: TEST_UUID.category, quantity: 2 },
      ],
    };
    expect(TCreateOrderBody.parse(body)).toEqual(body);
  });
});

describe("admin product/category DTOs", () => {
  it("TCreateProductBody requires a positive price and a category", () => {
    const valid = {
      name: "Pizza",
      description: "Tasty",
      price: 9.99,
      categoryId: TEST_UUID.category,
    };
    expect(TCreateProductBody.parse(valid)).toEqual(valid);
    expect(() =>
      TCreateProductBody.parse({ ...valid, price: 0 }),
    ).toThrow();
    expect(() =>
      TCreateProductBody.parse({ ...valid, price: -5 }),
    ).toThrow();
    expect(() =>
      TCreateProductBody.parse({ ...valid, categoryId: "nope" }),
    ).toThrow();
  });

  it("TUpdateProductBody allows a nullable image", () => {
    expect(TUpdateProductBody.parse({ image: null })).toEqual({ image: null });
    expect(TUpdateProductBody.parse({})).toEqual({});
  });

  it("TCreateCategoryBody accepts an optional parent", () => {
    expect(TCreateCategoryBody.parse({ name: "Drinks" })).toEqual({
      name: "Drinks",
    });
    expect(
      TCreateCategoryBody.parse({
        name: "Coffee",
        parentId: TEST_UUID.category,
      }),
    ).toMatchObject({ parentId: TEST_UUID.category });
  });

  it("TUpdateCategoryBody allows nulling the parent", () => {
    expect(TUpdateCategoryBody.parse({ parentId: null })).toEqual({
      parentId: null,
    });
  });
});

describe("admin user DTOs", () => {
  it("TUpdateUserBody rejects an empty body via refine", () => {
    expect(() => TUpdateUserBody.parse({})).toThrow(
      /At least one field must be provided/,
    );
  });

  it("TUpdateUserBody only allows ACTIVE/BLOCKED status transitions", () => {
    expect(TUpdateUserBody.parse({ status: "BLOCKED" })).toEqual({
      status: "BLOCKED",
    });
    expect(() => TUpdateUserBody.parse({ status: "DELETED" })).toThrow();
  });

  it("TUpdateUserBody accepts profile-only updates", () => {
    expect(
      TUpdateUserBody.parse({ firstName: "Jane", phone: "+1" }),
    ).toEqual({ firstName: "Jane", phone: "+1" });
  });
});
