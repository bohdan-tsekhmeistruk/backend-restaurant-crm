import { z } from "zod";
import type { Prisma } from "src/generated/prisma/client.js";

export const TAddCartItemBody = z.object({
  productId: z.uuid(),
  quantity: z.number().int().min(1).max(99).default(1),
});

export type TAddCartItemBody = z.output<typeof TAddCartItemBody>;

export type TAddCartItemInput = {
  in: { json: z.input<typeof TAddCartItemBody> };
  out: { json: TAddCartItemBody };
};

export const TUpdateCartItemBody = z.object({
  quantity: z.number().int().min(1).max(99),
});

export type TUpdateCartItemBody = z.infer<typeof TUpdateCartItemBody>;

export const TCartItemIdParam = z.object({
  id: z.uuid(),
});

export type TUpdateCartItemInput = {
  in: {
    param: z.input<typeof TCartItemIdParam>;
    json: TUpdateCartItemBody;
  };
  out: {
    param: z.output<typeof TCartItemIdParam>;
    json: TUpdateCartItemBody;
  };
};

export type TDeleteCartItemInput = {
  in: { param: z.input<typeof TCartItemIdParam> };
  out: { param: z.output<typeof TCartItemIdParam> };
};

export const CartSelect = {
  id: true,
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
          isAvailable: true,
        },
      },
    },
  },
} as const satisfies Prisma.CartSelect;

export type TCartResponse = Prisma.CartGetPayload<{
  select: typeof CartSelect;
}>;
