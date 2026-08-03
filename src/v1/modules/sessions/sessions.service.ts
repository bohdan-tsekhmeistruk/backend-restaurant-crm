import type { PrismaClient } from "src/generated/prisma/client.js";
import jwtService from "src/v1/modules/auth/jwt.service.js";
import type { TEnv } from "src/lib/dto/env.dto.js";

type TSessionResponse = {
  refreshToken: string;
};

type TCreateSession = {
  userId: string;
  ipAddress: string | undefined;
  userAgent: string | undefined;
};

type TGetSession = {
  userId: string;
  refreshToken?: string;
  ipAddress: string | undefined;
  userAgent: string | undefined;
};

class SessionsService {
  /**
   * Gets a session by user ID, IP address, and user agent
   * @param {PrismaClient} prisma - PrismaClient instance
   * @param {TGetSession} params - Session parameters
   * @param {string} params.userId - User ID
   * @param {string} params.refreshToken - Refresh token
   * @param {string | undefined} params.ipAddress - User IP address
   * @param {string | undefined} params.userAgent - User agent
   * @returns {Promise<TSessionResponse | null>} Session object or null if not found
   */
  async getSession(
    prisma: PrismaClient,
    { userId, refreshToken, ipAddress, userAgent }: TGetSession,
  ): Promise<TSessionResponse | null> {
    const session = await prisma.session.findFirst({
      where: {
        userId,
        ...(refreshToken ? { refreshToken } : {}),
        ipAddress,
        userAgent,
      },
      select: {
        refreshToken: true,
      },
    });
    return session;
  }

  /**
   * Creates a new session and returns a session response
   * @param {PrismaClient} prisma - PrismaClient instance
   * @param {TCreateSession} params - Session parameters
   * @param {string} params.userId - User ID
   * @param {number} params.expiresInDays - Number of days to expire the session
   * @param {string | undefined} params.ipAddress - User IP address
   * @param {string | undefined} params.userAgent - User agent
   * @returns {Promise<TSessionResponse>} Session object
   */
  async createSession(
    prisma: PrismaClient,
    envVars: TEnv,
    { userId, ipAddress, userAgent }: TCreateSession,
  ): Promise<TSessionResponse> {
    const refreshToken = jwtService.issueRefreshToken(
      userId,
      envVars.REFRESH_TOKEN_SECRET,
    );

    const session = await prisma.session.create({
      data: {
        userId,
        refreshToken,
        ipAddress,
        userAgent,
      },
      select: {
        refreshToken: true,
      },
    });

    return {
      refreshToken: session.refreshToken,
    };
  }
}

export default new SessionsService();
