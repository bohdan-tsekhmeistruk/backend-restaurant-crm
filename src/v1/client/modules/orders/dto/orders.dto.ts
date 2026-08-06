import { z } from "zod";
import { OrderStatus, type Prisma } from "src/generated/prisma/client.js";

export const TSearchOrdersQuery = z.object({
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

export const TCancelOrderBody = z.object({
  status: z.literal(OrderStatus.CANCELLED),
});

export type TCancelOrderBody = z.infer<typeof TCancelOrderBody>;

export type TCancelOrderInput = {
  in: {
    param: z.input<typeof TGetOrderByIdParam>;
    json: TCancelOrderBody;
  };
  out: {
    param: z.output<typeof TGetOrderByIdParam>;
    json: TCancelOrderBody;
  };
};

export const OrderSelect = {
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  items: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      quantity: true,
      product: {
        select: {
          id: true,
          name: true,
          image: true,
          price: true,
        },
      },
    },
  },
} as const satisfies Prisma.OrderSelect;

export type TOrderResponse = Prisma.OrderGetPayload<{
  select: typeof OrderSelect;
}>;
