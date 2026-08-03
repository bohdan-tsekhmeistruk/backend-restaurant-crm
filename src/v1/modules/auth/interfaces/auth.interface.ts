import type { Prisma } from "src/generated/prisma/client.js";

export const UserAuthSelect = {
  id: true,

  email: true,
  password: true,

  firstName: true,
  lastName: true,
  phone: true,

  role: true,
  status: true,

  isVerified: true,
} as const satisfies Prisma.UserSelect;

export type TUserAuthSelect = Prisma.UserGetPayload<{
  select: typeof UserAuthSelect;
}>;

export type TAuthResponse = {
  user: TUserAuthSelect;

  accessToken: string;
  refreshToken: string;
};

export type TRefreshTokenResponse = {
  accessToken: string;
  refreshToken: string;
};
