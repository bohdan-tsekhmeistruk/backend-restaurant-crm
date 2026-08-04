import type { PrismaClient } from "src/generated/prisma/client.js";
import type { TUpdateAccountBody } from "./dto/account.dto.js";

class AccountService {
  async updateAccount(
    prisma: PrismaClient,
    userId: string,
    body: TUpdateAccountBody,
  ) {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: body,
    });
    return updatedUser;
  }
}

export default new AccountService();
