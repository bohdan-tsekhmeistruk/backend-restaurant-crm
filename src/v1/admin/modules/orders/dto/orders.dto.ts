import { z } from "zod";
import { OrderStatus, type Prisma } from "src/generated/prisma/client.js";

export const TSearchOrdersQuery = z.object({
  userId: z.uuid().optional(),
  status: z.enum(OrderStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type TSearchOrdersQuery = z.output<typeof TSearchOrdersQuery>;

export type TSearchOrdersInput = {
  in: { query: z.input<typeof TSearchOrdersQuery> };
  out: { query: TSearchOrdersQuery };
};

export const TGetOrderByIdParam = z.object({
  id: z.uuid(),
});

export type TGetOrderByIdParam = {
  in: { param: z.input<typeof TGetOrderByIdParam> };
  out: { param: z.output<typeof TGetOrderByIdParam> };
};

export const TCreateOrderBody = z.object({
  userId: z.uuid(),
  items: z
    .array(
      z.object({
        productId: z.uuid(),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(100)
    .refine(
      (items) =>
        new Set(items.map((item) => item.productId)).size === items.length,
      { message: "Duplicate products are not allowed" },
    ),
});

export type TCreateOrderBody = z.infer<typeof TCreateOrderBody>;

export type TCreateOrderInput = {
  in: { json: TCreateOrderBody };
  out: { json: TCreateOrderBody };
};

export const TUpdateOrderBody = z.object({
  status: z.enum(OrderStatus),
});

export type TUpdateOrderBody = z.infer<typeof TUpdateOrderBody>;

export type TUpdateOrderInput = {
  in: {
    param: z.input<typeof TGetOrderByIdParam>;
    json: TUpdateOrderBody;
  };
  out: {
    param: z.output<typeof TGetOrderByIdParam>;
    json: TUpdateOrderBody;
  };
};

export type TDeleteOrderInput = TGetOrderByIdParam;

export const OrderSelect = {
  id: true,
  userId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  items: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      orderId: true,
      productId: true,
      quantity: true,
      createdAt: true,
      updatedAt: true,
      product: {
        select: {
          id: true,
          name: true,
          image: true,
          price: true,
          isAvailable: true,
        },
      },
    },
  },
} as const satisfies Prisma.OrderSelect;

export type TOrderResponse = Prisma.OrderGetPayload<{
  select: typeof OrderSelect;
}>;
