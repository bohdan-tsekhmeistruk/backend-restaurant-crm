import { z, type Hook, type RouteConfig } from "@hono/zod-openapi";
import {
  OrderStatus,
  UserRole,
  UserStatus,
} from "src/generated/prisma/client.js";

/**
 * Shared validation-error hook: preserves the existing error contract
 * (HTTP 400 with zod issues in `message`) for every OpenAPI route.
 */
export const openAPIDefaultHook: Hook<any, any, any, any> = (result, c) => {
  if (!result.success) {
    return c.json({ message: result.error.issues }, 400);
  }
};

/**
 * JSON response with a zod body schema.
 */
export function jsonContent<S extends z.ZodType>(
  schema: S,
  description: string,
) {
  return {
    description,
    content: { "application/json": { schema } },
  };
}

/**
 * Response without a body (204, errors). Intentionally content-less: it keeps
 * handlers that also return plain `Response` (centralized error handler)
 * assignable to the zod-openapi handler type.
 */
export function noContent(description: string) {
  return { description };
}

/**
 * @see noContent
 */
export function errorResponse(description: string) {
  return { description };
}

type Security = NonNullable<RouteConfig["security"]>;

export const cookieSecurity: Security = [{ cookieAuth: [] }];

export const refreshCookieSecurity: Security = [{ refreshCookieAuth: [] }];

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const UserRoleSchema = z.enum(UserRole).openapi("UserRole");

export const UserStatusSchema = z.enum(UserStatus).openapi("UserStatus");

export const OrderStatusSchema = z.enum(OrderStatus).openapi("OrderStatus");

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

const CategoryRefSchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

export const CategorySchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    description: z.string().nullable(),
    parent: CategoryRefSchema.nullable(),
    children: z.array(CategoryRefSchema),
  })
  .openapi("Category");

const ProductCategorySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  parent: CategoryRefSchema.nullable(),
});

export const ProductSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    description: z.string(),
    image: z.string().nullable(),
    price: z.number(),
    isAvailable: z.boolean(),
    category: ProductCategorySchema.nullable(),
  })
  .openapi("Product");

export const AdminProductSchema = z
  .object({
    id: z.uuid(),
    categoryId: z.uuid(),
    name: z.string(),
    description: z.string(),
    image: z.string().nullable(),
    price: z.number(),
    isAvailable: z.boolean(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    category: ProductCategorySchema.nullable(),
  })
  .openapi("AdminProduct");

const CartProductSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  image: z.string().nullable(),
  price: z.number(),
  isAvailable: z.boolean(),
});

export const CartSchema = z
  .object({
    id: z.uuid(),
    items: z.array(
      z.object({
        id: z.uuid(),
        quantity: z.number().int(),
        product: CartProductSchema,
      }),
    ),
  })
  .openapi("Cart");

export const AdminCartSchema = z
  .object({
    id: z.uuid(),
    userId: z.uuid(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    items: z.array(
      z.object({
        id: z.uuid(),
        cartId: z.uuid(),
        productId: z.uuid(),
        quantity: z.number().int(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime(),
        product: CartProductSchema,
      }),
    ),
  })
  .openapi("AdminCart");

const OrderProductSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  image: z.string().nullable(),
  price: z.number(),
});

export const OrderSchema = z
  .object({
    id: z.uuid(),
    status: OrderStatusSchema,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    items: z.array(
      z.object({
        id: z.uuid(),
        quantity: z.number().int(),
        product: OrderProductSchema,
      }),
    ),
  })
  .openapi("Order");

export const AdminOrderSchema = z
  .object({
    id: z.uuid(),
    userId: z.uuid(),
    status: OrderStatusSchema,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    items: z.array(
      z.object({
        id: z.uuid(),
        orderId: z.uuid(),
        productId: z.uuid(),
        quantity: z.number().int(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime(),
        product: CartProductSchema,
      }),
    ),
  })
  .openapi("AdminOrder");

export const UserSchema = z
  .object({
    id: z.uuid(),
    email: z.email(),
    firstName: z.string(),
    lastName: z.string(),
    phone: z.string(),
    role: UserRoleSchema,
    status: UserStatusSchema,
    isVerified: z.boolean(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi("User");

export const AuthResponseSchema = z
  .object({
    user: z.object({
      id: z.uuid(),
      email: z.email(),
      firstName: z.string(),
      lastName: z.string(),
      phone: z.string(),
      role: UserRoleSchema,
      status: UserStatusSchema,
      isVerified: z.boolean(),
    }),
    accessToken: z.string(),
    refreshToken: z.string(),
  })
  .openapi("AuthResponse");
