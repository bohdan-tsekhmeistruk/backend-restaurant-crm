import type { PrismaClient, User } from "src/generated/prisma/client.js";

export type TServerContext = {
  Variables: {
    prisma: PrismaClient;
    user: User | null;
  };
};
