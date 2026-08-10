import { beforeEach, describe, expect, it } from "vitest";
import usersService from "src/v1/admin/modules/users/users.service.js";
import {
  asPrisma,
  createPrismaMock,
  type PrismaMock,
} from "../../helpers/prisma-mock.js";
import { expectHttpError } from "../../helpers/assert.js";
import { makeUser, TEST_UUID } from "../../helpers/http.js";

describe("Admin UsersService", () => {
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = createPrismaMock();
  });

  describe("searchUsers", () => {
    it("applies all filters with OR name matching and pagination", async () => {
      prisma.user.findMany.mockResolvedValue([makeUser()]);

      const result = await usersService.searchUsers(asPrisma(prisma), {
        email: "john",
        name: "do",
        role: "USER",
        status: "ACTIVE",
        page: 3,
        limit: 5,
      });

      expect(result).toHaveLength(1);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          email: { contains: "john", mode: "insensitive" },
          OR: [
            { firstName: { contains: "do", mode: "insensitive" } },
            { lastName: { contains: "do", mode: "insensitive" } },
          ],
          role: "USER",
          status: "ACTIVE",
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        skip: 10,
        select: expect.objectContaining({ email: true }),
      });
    });

    it("queries without filters when none are given", async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await usersService.searchUsers(asPrisma(prisma), { page: 1, limit: 20 });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });
  });

  describe("getUserById", () => {
    it("returns the user when found", async () => {
      const user = makeUser();
      prisma.user.findUnique.mockResolvedValue(user);

      await expect(
        usersService.getUserById(asPrisma(prisma), TEST_UUID.user),
      ).resolves.toEqual(user);
    });

    it("throws 404 when the user does not exist", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expectHttpError(
        usersService.getUserById(asPrisma(prisma), TEST_UUID.missing),
        404,
        "User not found",
      );
    });
  });

  describe("updateUser", () => {
    it.each([{ status: "BLOCKED" }, { role: "ADMIN" }])(
      "forbids an admin from changing their own %o",
      async (body) => {
        await expectHttpError(
          usersService.updateUser(
            asPrisma(prisma),
            TEST_UUID.admin,
            TEST_UUID.admin,
            body as any,
          ),
          400,
          "Cannot change your own status or role",
        );
        expect(prisma.user.findUnique).not.toHaveBeenCalled();
      },
    );

    it("allows an admin to update their own profile fields", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: TEST_UUID.admin });
      prisma.user.update.mockResolvedValue(makeUser({ id: TEST_UUID.admin }));

      await usersService.updateUser(
        asPrisma(prisma),
        TEST_UUID.admin,
        TEST_UUID.admin,
        { firstName: "Boss" },
      );

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: TEST_UUID.admin },
        data: { firstName: "Boss" },
        select: expect.anything(),
      });
    });

    it("throws 404 when the user does not exist", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expectHttpError(
        usersService.updateUser(
          asPrisma(prisma),
          TEST_UUID.admin,
          TEST_UUID.missing,
          { firstName: "x" },
        ),
        404,
        "User not found",
      );
    });

    it("revokes all sessions when the user is blocked", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: TEST_UUID.user });
      prisma.user.update.mockResolvedValue(makeUser({ status: "BLOCKED" }));
      prisma.session.deleteMany.mockResolvedValue({ count: 3 });

      await usersService.updateUser(
        asPrisma(prisma),
        TEST_UUID.admin,
        TEST_UUID.user,
        { status: "BLOCKED" },
      );

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: TEST_UUID.user },
      });
    });

    it.each([{ status: "ACTIVE" }, { firstName: "Jane" }])(
      "keeps sessions intact for %o",
      async (body) => {
        prisma.user.findUnique.mockResolvedValue({ id: TEST_UUID.user });
        prisma.user.update.mockResolvedValue(makeUser(body as any));

        await usersService.updateUser(
          asPrisma(prisma),
          TEST_UUID.admin,
          TEST_UUID.user,
          body as any,
        );

        expect(prisma.session.deleteMany).not.toHaveBeenCalled();
      },
    );
  });

  describe("deleteUser", () => {
    it("forbids deleting your own account", async () => {
      await expectHttpError(
        usersService.deleteUser(asPrisma(prisma), TEST_UUID.admin, TEST_UUID.admin),
        400,
        "Cannot delete your own account",
      );
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("throws 404 when the user does not exist", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expectHttpError(
        usersService.deleteUser(asPrisma(prisma), TEST_UUID.admin, TEST_UUID.missing),
        404,
        "User not found",
      );
    });

    it("rejects deleting an already deleted user", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: TEST_UUID.user,
        status: "DELETED",
      });

      await expectHttpError(
        usersService.deleteUser(asPrisma(prisma), TEST_UUID.admin, TEST_UUID.user),
        400,
        "User is already deleted",
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("soft-deletes the user and revokes all sessions", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: TEST_UUID.user,
        status: "ACTIVE",
      });
      prisma.user.update.mockResolvedValue({ id: TEST_UUID.user });
      prisma.session.deleteMany.mockResolvedValue({ count: 1 });

      await usersService.deleteUser(
        asPrisma(prisma),
        TEST_UUID.admin,
        TEST_UUID.user,
      );

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: TEST_UUID.user },
        data: { status: "DELETED" },
        select: { id: true },
      });
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: TEST_UUID.user },
      });
    });
  });
});
