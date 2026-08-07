import { z } from "zod";
import {
  UserRole,
  UserStatus,
  type Prisma,
} from "src/generated/prisma/client.js";

export const TSearchUsersQuery = z.object({
  email: z.string().min(1).max(255).optional(),
  name: z.string().min(1).max(255).optional(),
  role: z.enum(UserRole).optional(),
  status: z.enum(UserStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type TSearchUsersQuery = z.output<typeof TSearchUsersQuery>;

export type TSearchUsersInput = {
  in: { query: z.input<typeof TSearchUsersQuery> };
  out: { query: TSearchUsersQuery };
};

export const TGetUserByIdParam = z.object({
  id: z.uuid(),
});

export type TGetUserByIdParam = {
  in: { param: z.input<typeof TGetUserByIdParam> };
  out: { param: z.output<typeof TGetUserByIdParam> };
};

export const TUpdateUserBody = z
  .object({
    firstName: z.string().min(1).max(32).optional(),
    lastName: z.string().min(1).max(32).optional(),
    phone: z.string().min(1).max(32).optional(),
    role: z.enum(UserRole).optional(),
    status: z.enum([UserStatus.ACTIVE, UserStatus.BLOCKED]).optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: "At least one field must be provided",
  });

export type TUpdateUserBody = z.infer<typeof TUpdateUserBody>;

export type TUpdateUserInput = {
  in: {
    param: z.input<typeof TGetUserByIdParam>;
    json: TUpdateUserBody;
  };
  out: {
    param: z.output<typeof TGetUserByIdParam>;
    json: TUpdateUserBody;
  };
};

export type TDeleteUserInput = TGetUserByIdParam;

export const UserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  status: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.UserSelect;

export type TUserResponse = Prisma.UserGetPayload<{
  select: typeof UserSelect;
}>;
