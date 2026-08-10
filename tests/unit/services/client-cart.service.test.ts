import { beforeEach, describe, expect, it } from "vitest";
import cartService from "src/v1/client/modules/cart/cart.service.js";
import {
  asPrisma,
  createPrismaMock,
  type PrismaMock,
} from "../../helpers/prisma-mock.js";
import { expectHttpError } from "../../helpers/assert.js";
import { TEST_UUID } from "../../helpers/http.js";

const FULL_CART = {
  id: TEST_UUID.cart,
  items: [
    {
      id: TEST_UUID.cartItem,
      quantity: 2,
      product: {
        id: TEST_UUID.product,
        name: "Pizza",
        image: null,
        price: 9.99,
        isAvailable: true,
      },
    },
  ],
};

describe("Client CartService", () => {
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = createPrismaMock();
  });

  describe("getMyCart", () => {
    it("upserts the cart so it is auto-created on first access", async () => {
      prisma.cart.upsert.mockResolvedValue(FULL_CART);

      const result = await cartService.getMyCart(asPrisma(prisma), TEST_UUID.user);

      expect(result).toEqual(FULL_CART);
      expect(prisma.cart.upsert).toHaveBeenCalledWith({
        where: { userId: TEST_UUID.user },
        create: { userId: TEST_UUID.user },
        update: {},
        select: expect.objectContaining({ id: true }),
      });
    });
  });

  describe("addCartItem", () => {
    it("rejects an unknown product with 404", async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expectHttpError(
        cartService.addCartItem(asPrisma(prisma), TEST_UUID.user, {
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
        cartService.addCartItem(asPrisma(prisma), TEST_UUID.user, {
          productId: TEST_UUID.product,
          quantity: 1,
        }),
        400,
        "Product is not available",
      );
    });

    it("creates a new cart item when the product is not in the cart", async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: TEST_UUID.product,
        isAvailable: true,
      });
      prisma.cart.upsert
        .mockResolvedValueOnce({ id: TEST_UUID.cart })
        .mockResolvedValueOnce(FULL_CART);
      prisma.cartItem.findFirst.mockResolvedValue(null);
      prisma.cartItem.create.mockResolvedValue({ id: TEST_UUID.cartItem });

      const result = await cartService.addCartItem(
        asPrisma(prisma),
        TEST_UUID.user,
        { productId: TEST_UUID.product, quantity: 2 },
      );

      expect(prisma.cartItem.create).toHaveBeenCalledWith({
        data: {
          cartId: TEST_UUID.cart,
          productId: TEST_UUID.product,
          quantity: 2,
        },
        select: { id: true },
      });
      expect(result).toEqual(FULL_CART);
    });

    it("increments the quantity when the product is already in the cart", async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: TEST_UUID.product,
        isAvailable: true,
      });
      prisma.cart.upsert
        .mockResolvedValueOnce({ id: TEST_UUID.cart })
        .mockResolvedValueOnce(FULL_CART);
      prisma.cartItem.findFirst.mockResolvedValue({
        id: TEST_UUID.cartItem,
        quantity: 3,
      });
      prisma.cartItem.update.mockResolvedValue({ id: TEST_UUID.cartItem });

      await cartService.addCartItem(asPrisma(prisma), TEST_UUID.user, {
        productId: TEST_UUID.product,
        quantity: 2,
      });

      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: TEST_UUID.cartItem },
        data: { quantity: 5 },
        select: { id: true },
      });
      expect(prisma.cartItem.create).not.toHaveBeenCalled();
    });
  });

  describe("updateCartItem", () => {
    it("rejects an item that does not belong to the user with 404", async () => {
      prisma.cartItem.findFirst.mockResolvedValue(null);

      await expectHttpError(
        cartService.updateCartItem(
          asPrisma(prisma),
          TEST_UUID.user,
          TEST_UUID.cartItem,
          { quantity: 5 },
        ),
        404,
        "Cart item not found",
      );

      expect(prisma.cartItem.findFirst).toHaveBeenCalledWith({
        where: { id: TEST_UUID.cartItem, cart: { userId: TEST_UUID.user } },
        select: { id: true },
      });
    });

    it("updates the quantity and returns the refreshed cart", async () => {
      prisma.cartItem.findFirst.mockResolvedValue({ id: TEST_UUID.cartItem });
      prisma.cartItem.update.mockResolvedValue({ id: TEST_UUID.cartItem });
      prisma.cart.upsert.mockResolvedValue(FULL_CART);

      const result = await cartService.updateCartItem(
        asPrisma(prisma),
        TEST_UUID.user,
        TEST_UUID.cartItem,
        { quantity: 7 },
      );

      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: TEST_UUID.cartItem },
        data: { quantity: 7 },
        select: { id: true },
      });
      expect(result).toEqual(FULL_CART);
    });
  });

  describe("deleteCartItem", () => {
    it("rejects a missing item with 404", async () => {
      prisma.cartItem.findFirst.mockResolvedValue(null);

      await expectHttpError(
        cartService.deleteCartItem(
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
      prisma.cart.upsert.mockResolvedValue({ ...FULL_CART, items: [] });

      const result = await cartService.deleteCartItem(
        asPrisma(prisma),
        TEST_UUID.user,
        TEST_UUID.cartItem,
      );

      expect(prisma.cartItem.delete).toHaveBeenCalledWith({
        where: { id: TEST_UUID.cartItem },
      });
      expect(result.items).toEqual([]);
    });
  });
});
