import { z } from "zod";
import type { Prisma } from "src/generated/prisma/client.js";

export const TUserIdParam = z.object({
  userId: z.uuid(),
});

export const TCartItemParams = z.object({
  userId: z.uuid(),
  itemId: z.uuid(),
});

export type TGetUserCartInput = {
  in: { param: z.input<typeof TUserIdParam> };
  out: { param: z.output<typeof TUserIdParam> };
};

export const TAddUserCartItemBody = z.object({
  productId: z.uuid(),
  quantity: z.number().int().min(1).max(99).default(1),
});

export type TAddUserCartItemBody = z.output<typeof TAddUserCartItemBody>;

export type TAddUserCartItemInput = {
  in: {
    param: z.input<typeof TUserIdParam>;
    json: z.input<typeof TAddUserCartItemBody>;
  };
  out: {
    param: z.output<typeof TUserIdParam>;
    json: TAddUserCartItemBody;
  };
};

export const TUpdateUserCartItemBody = z.object({
  productId: z.uuid().optional(),
  quantity: z.number().int().min(1).max(99).optional(),
});

export type TUpdateUserCartItemBody = z.infer<typeof TUpdateUserCartItemBody>;

export type TUpdateUserCartItemInput = {
  in: {
    param: z.input<typeof TCartItemParams>;
    json: TUpdateUserCartItemBody;
  };
  out: {
    param: z.output<typeof TCartItemParams>;
    json: TUpdateUserCartItemBody;
  };
};

export type TDeleteUserCartItemInput = {
  in: { param: z.input<typeof TCartItemParams> };
  out: { param: z.output<typeof TCartItemParams> };
};

export const CartSelect = {
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  items: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      cartId: true,
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
} as const satisfies Prisma.CartSelect;

export type TCartResponse = Prisma.CartGetPayload<{
  select: typeof CartSelect;
}>;
