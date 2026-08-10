import { expect } from "vitest";
import { HTTPException } from "hono/http-exception";

/**
 * Asserts that a promise rejects with an HTTPException carrying the given
 * status code and a JSON body of `{ message, ... }`.
 */
export async function expectHttpError(
  promise: Promise<unknown>,
  status: number,
  message: string,
): Promise<void> {
  try {
    await promise;
    expect.unreachable("Expected the promise to reject with an HTTPException");
  } catch (error) {
    expect(error).toBeInstanceOf(HTTPException);
    const response = (error as HTTPException).getResponse();
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ message });
  }
}
