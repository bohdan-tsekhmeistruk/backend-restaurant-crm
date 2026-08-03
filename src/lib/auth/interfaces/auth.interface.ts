import type { Prisma } from "src/generated/prisma/client.js";

export const UserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
} as const satisfies Prisma.UserSelect;

export const SessionSelect = {
  accessToken: true,
  refreshToken: true,
  expiresAt: true,
  user: {
    select: UserSelect,
  },
} as const satisfies Prisma.SessionSelect;

export type TValidatedSessionResponse = Prisma.SessionGetPayload<{
  select: typeof SessionSelect;
}>;