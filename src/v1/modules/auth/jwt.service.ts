import { sign, verify } from "hono/jwt";
import type { SignatureAlgorithm } from "hono/utils/jwt/jwa";
import type { SignatureKey } from "hono/utils/jwt/jws";
import crypto from "crypto";

class JwtService {
  private readonly accessTokenAlg: SignatureAlgorithm = "HS256";
  private readonly refreshTokenAlg: SignatureAlgorithm = "HS512";

  /**
   * Issues an access token
   * @param {string} userId - The user ID
   * @param {SignatureKey} key - The key to hash the token
   * @returns {Promise<string>} The access token using hono/jwt
   */
  async issueToken(userId: string, key: SignatureKey) {
    return sign(
      {
        userId,
        iat: Math.floor(new Date().getTime() / 1000),
        exp: Math.floor(new Date(Date.now() + 15 * 60 * 1000).getTime() / 1000), // In 15 minutes
      },
      key,
      this.accessTokenAlg,
    );
  }

  /**
   * Issues a refresh token
   * @returns {string} A cryptographically random refresh token
   */
  issueRefreshToken(): string {
    return crypto.randomBytes(64).toString("base64url");
  }

  /**
   * Verifies a token
   * @param {string} token - The token to verify
   * @param {SignatureKey} key - The key to hash the token
   * @param {"access" | "refresh"} type - The type of token (access or refresh)
   * @returns {Promise<{userId: string, iat: number, exp: number} | null>} Decoded token data or null if invalid
   */
  async verifyToken(
    token: string,
    key: SignatureKey,
    type: "access" | "refresh" = "access",
  ) {
    return verify(
      token,
      key,
      type === "access" ? this.accessTokenAlg : this.refreshTokenAlg,
    );
  }
}

export default new JwtService();
