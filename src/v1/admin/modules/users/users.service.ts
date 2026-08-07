import {
  UserStatus,
  type PrismaClient,
} from "src/generated/prisma/client.js";
import {
  UserSelect,
  TSearchUsersQuery,
  type TUpdateUserBody,
  type TUserResponse,
} from "./dto/users.dto.js";
import errorHandler from "src/lib/error.handler.js";

class UsersService {
  /**
   * Search for users
   * @param {PrismaClient} prisma - The Prisma client
   * @param {TSearchUsersQuery} query - The query object
   * @returns {Promise<TUserResponse[]>} - The users
   */
  async searchUsers(
    prisma: PrismaClient,
    query: TSearchUsersQuery,
  ): Promise<TUserResponse[]> {
    const users = await prisma.user.findMany({
      where: {
        ...(query.email && {
          email: { contains: query.email, mode: "insensitive" },
        }),
        ...(query.name && {
          OR: [
            { firstName: { contains: query.name, mode: "insensitive" } },
            { lastName: { contains: query.name, mode: "insensitive" } },
          ],
        }),
        ...(query.role && { role: query.role }),
        ...(query.status && { status: query.status }),
      },
      orderBy: { createdAt: "desc" },
      take: query.limit,
      skip: (query.page - 1) * query.limit,
      select: UserSelect,
    });
    return users;
  }

  /**
   * Get a user by id
   * @param {PrismaClient} prisma - The Prisma client
   * @param {string} id - The id of the user
   * @returns {Promise<TUserResponse>} - The user
   */
  async getUserById(prisma: PrismaClient, id: string): Promise<TUserResponse> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: UserSelect,
    });

    if (!user) {
      throw errorHandler.httpError(404, "User not found");
    }

    return user;
  }

  /**
   * Update a user, revoking sessions when blocked
   * @param {PrismaClient} prisma - The Prisma client
   * @param {string} adminId - The id of the admin performing the action
   * @param {string} id - The id of the user
   * @param {TUpdateUserBody} body - The user data
   * @returns {Promise<TUserResponse>} - The updated user
   */
  async updateUser(
    prisma: PrismaClient,
    adminId: string,
    id: string,
    body: TUpdateUserBody,
  ): Promise<TUserResponse> {
    if (
      adminId === id &&
      (body.status !== undefined || body.role !== undefined)
    ) {
      throw errorHandler.httpError(
        400,
        "Cannot change your own status or role",
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!user) {
      throw errorHandler.httpError(404, "User not found");
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: body,
        select: UserSelect,
      });

      if (body.status && body.status !== UserStatus.ACTIVE) {
        await tx.session.deleteMany({
          where: { userId: id },
        });
      }

      return updated;
    });

    return updatedUser;
  }

  /**
   * Soft delete a user (status DELETED) and revoke all sessions
   * @param {PrismaClient} prisma - The Prisma client
   * @param {string} adminId - The id of the admin performing the action
   * @param {string} id - The id of the user
   * @returns {Promise<void>} - Return void if success
   */
  async deleteUser(
    prisma: PrismaClient,
    adminId: string,
    id: string,
  ): Promise<void> {
    if (adminId === id) {
      throw errorHandler.httpError(400, "Cannot delete your own account");
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!user) {
      throw errorHandler.httpError(404, "User not found");
    }
    if (user.status === UserStatus.DELETED) {
      throw errorHandler.httpError(400, "User is already deleted");
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { status: UserStatus.DELETED },
        select: { id: true },
      });
      await tx.session.deleteMany({
        where: { userId: id },
      });
    });

    return;
  }
}

export default new UsersService();
