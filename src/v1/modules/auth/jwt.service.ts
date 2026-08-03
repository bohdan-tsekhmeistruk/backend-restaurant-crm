import { sign, verify, decode } from "hono/jwt";
import type { SignatureAlgorithm } from "hono/utils/jwt/jwa";
import type { SignatureKey } from "hono/utils/jwt/jws";
import crypto from "crypto";

class JwtService {
  private readonly accessTokenAlg: SignatureAlgorithm = "HS256";
  private readonly refreshTokenAlg: SignatureAlgorithm = "HS512";

  async issueToken(userId: string, key: SignatureKey) {
    return sign(
      {
        userId,
        iat: Math.floor(new Date().getTime()/1000),
        exp: Math.floor(new Date(Date.now() + 15 * 60 * 1000).getTime()/1000), // In 15 minutes
      },
      key,
      this.accessTokenAlg,
    );
  }

  /**
   * Issues a refresh token
   * @param {string} userId - The user ID
   * @param {string} key - The key to hash the token
   * @returns {Promise<string>} The refresh token using crypto
   */
  issueRefreshToken(userId: string, key: string): string {
    return crypto.createHmac("sha512", key).update(userId).digest("hex");
  }

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
