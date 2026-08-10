import { beforeEach, describe, expect, it } from "vitest";
import cartService from "src/v1/admin/modules/cart/cart.service.js";
import {
  asPrisma,
  createPrismaMock,
  type PrismaMock,
} from "../../helpers/prisma-mock.js";
import { expectHttpError } from "../../helpers/assert.js";
import { TEST_UUID } from "../../helpers/http.js";

const ADMIN_CART = {
  id: TEST_UUID.cart,
  userId: TEST_UUID.user,
  items: [],
};

describe("Admin CartService", () => {
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = createPrismaMock();
  });

  describe("getUserCart", () => {
    it("throws 404 when the user does not exist", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expectHttpError(
        cartService.getUserCart(asPrisma(prisma), TEST_UUID.missing),
        404,
        "User not found",
      );
      expect(prisma.cart.upsert).not.toHaveBeenCalled();
    });

    it("upserts and returns the user's cart", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: TEST_UUID.user });
      prisma.cart.upsert.mockResolvedValue(ADMIN_CART);

      const result = await cartService.getUserCart(
        asPrisma(prisma),
        TEST_UUID.user,
      );

      expect(result).toEqual(ADMIN_CART);
      expect(prisma.cart.upsert).toHaveBeenCalledWith({
        where: { userId: TEST_UUID.user },
        create: { userId: TEST_UUID.user },
        update: {},
        select: expect.objectContaining({ id: true, userId: true }),
      });
    });
  });

  describe("addUserCartItem", () => {
    it("rejects an unknown product with 404", async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expectHttpError(
        cartService.addUserCartItem(asPrisma(prisma), TEST_UUID.user, {
          productId: TEST_UUID.product,
          quantity: 1,
        }),
        404,
        "Product not found",
      );
    });

    it("rejects an unavailable product with 400", async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: TEST_UUID.product,
        isAvailable: false,
      });

      await expectHttpError(
        cartService.addUserCartItem(asPrisma(prisma), TEST_UUID.user, {
          productId: TEST_UUID.product,
          quantity: 1,
        }),
        400,
        "Product is not available",
      );
    });

    it("propagates the 404 when the target user does not exist", async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: TEST_UUID.product,
        isAvailable: true,
      });
      prisma.user.findUnique.mockResolvedValue(null);

      await expectHttpError(
        cartService.addUserCartItem(asPrisma(prisma), TEST_UUID.missing, {
          productId: TEST_UUID.product,
          quantity: 1,
        }),
        404,
        "User not found",
      );
    });

    it("increments the quantity of an existing item", async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: TEST_UUID.product,
        isAvailable: true,
      });
      prisma.user.findUnique.mockResolvedValue({ id: TEST_UUID.user });
      prisma.cart.upsert.mockResolvedValue(ADMIN_CART);
      prisma.cartItem.findFirst.mockResolvedValue({
        id: TEST_UUID.cartItem,
        quantity: 1,
      });
      prisma.cartItem.update.mockResolvedValue({ id: TEST_UUID.cartItem });

      await cartService.addUserCartItem(asPrisma(prisma), TEST_UUID.user, {
        productId: TEST_UUID.product,
        quantity: 4,
      });

      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: TEST_UUID.cartItem },
        data: { quantity: 5 },
        select: { id: true },
      });
    });

    it("creates a new item when the product is not in the cart", async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: TEST_UUID.product,
        isAvailable: true,
      });
      prisma.user.findUnique.mockResolvedValue({ id: TEST_UUID.user });
      prisma.cart.upsert.mockResolvedValue(ADMIN_CART);
      prisma.cartItem.findFirst.mockResolvedValue(null);
      prisma.cartItem.create.mockResolvedValue({ id: TEST_UUID.cartItem });

      await cartService.addUserCartItem(asPrisma(prisma), TEST_UUID.user, {
        productId: TEST_UUID.product,
        quantity: 3,
      });

      expect(prisma.cartItem.create).toHaveBeenCalledWith({
        data: {
          cartId: TEST_UUID.cart,
          productId: TEST_UUID.product,
          quantity: 3,
        },
        select: { id: true },
      });
    });
  });

  describe("updateUserCartItem", () => {
    it("throws 404 when the cart item is missing", async () => {
      prisma.cartItem.findFirst.mockResolvedValue(null);

      await expectHttpError(
        cartService.updateUserCartItem(
          asPrisma(prisma),
          TEST_UUID.user,
          TEST_UUID.cartItem,
          { quantity: 2 },
        ),
        404,
        "Cart item not found",
      );
    });

    it("validates a new product before assigning it to the item", async () => {
      prisma.cartItem.findFirst.mockResolvedValue({ id: TEST_UUID.cartItem });
      prisma.product.findUnique.mockResolvedValue(null);

      await expectHttpError(
        cartService.updateUserCartItem(
          asPrisma(prisma),
          TEST_UUID.user,
          TEST_UUID.cartItem,
          { productId: TEST_UUID.missing },
        ),
        404,
        "Product not found",
      );
    });

    it("rejects switching the item to an unavailable product", async () => {
      prisma.cartItem.findFirst.mockResolvedValue({ id: TEST_UUID.cartItem });
      prisma.product.findUnique.mockResolvedValue({
        id: TEST_UUID.product,
        isAvailable: false,
      });

      await expectHttpError(
        cartService.updateUserCartItem(
          asPrisma(prisma),
          TEST_UUID.user,
          TEST_UUID.cartItem,
          { productId: TEST_UUID.product },
        ),
        400,
        "Product is not available",
      );
    });

    it("updates quantity and product together", async () => {
      prisma.cartItem.findFirst.mockResolvedValue({ id: TEST_UUID.cartItem });
      prisma.product.findUnique.mockResolvedValue({
        id: TEST_UUID.product,
        isAvailable: true,
      });
      prisma.cartItem.update.mockResolvedValue({ id: TEST_UUID.cartItem });
      prisma.user.findUnique.mockResolvedValue({ id: TEST_UUID.user });
      prisma.cart.upsert.mockResolvedValue(ADMIN_CART);

      await cartService.updateUserCartItem(
        asPrisma(prisma),
        TEST_UUID.user,
        TEST_UUID.cartItem,
        { productId: TEST_UUID.product, quantity: 9 },
      );

      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: TEST_UUID.cartItem },
        data: { productId: TEST_UUID.product, quantity: 9 },
        select: { id: true },
      });
    });
  });

  describe("deleteUserCartItem", () => {
    it("throws 404 when the cart item is missing", async () => {
      prisma.cartItem.findFirst.mockResolvedValue(null);

      await expectHttpError(
        cartService.deleteUserCartItem(
          asPrisma(prisma),
          TEST_UUID.user,
          TEST_UUID.cartItem,
        ),
        404,
        "Cart item not found",
      );
    });

    it("deletes the item and returns the refreshed cart", async () => {
      prisma.cartItem.findFirst.mockResolvedValue({ id: TEST_UUID.cartItem });
      prisma.cartItem.delete.mockResolvedValue({ id: TEST_UUID.cartItem });
      prisma.user.findUnique.mockResolvedValue({ id: TEST_UUID.user });
      prisma.cart.upsert.mockResolvedValue(ADMIN_CART);

      const result = await cartService.deleteUserCartItem(
        asPrisma(prisma),
        TEST_UUID.user,
        TEST_UUID.cartItem,
      );

      expect(prisma.cartItem.delete).toHaveBeenCalledWith({
        where: { id: TEST_UUID.cartItem },
      });
      expect(result).toEqual(ADMIN_CART);
    });
  });
});
