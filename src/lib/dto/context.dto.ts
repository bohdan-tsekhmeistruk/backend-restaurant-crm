import type { PrismaClient } from "src/generated/prisma/client.js";
import type { TValidatedUserResponse } from "../auth/interfaces/auth.interface.js";

export type TServerContext = {
  Variables: {
    prisma: PrismaClient;
    user: TValidatedUserResponse | null;
  };
};
