import type { PrismaClient } from "src/generated/prisma/client.js";
import jwtService from "src/v1/modules/auth/jwt.service.js";
import type {
  TCreateSessionParams,
  TDeviceSession,
  TGetDeviceSessionParams,
  TRotateSessionParams,
  TSession,
  TSessionResponse,
} from "./dto/sessions.dto.js";

class SessionsService {
  /**
   * Gets a session by its refresh token
   * @param {PrismaClient} prisma - PrismaClient instance
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<TSession | null>} Session object or null if not found
   */
  async getSessionByRefreshToken(
    prisma: PrismaClient,
    refreshToken: string,
  ): Promise<TSession | null> {
    const session = await prisma.session.findUnique({
      where: {
        refreshToken,
      },
      select: {
        id: true,
        userId: true,
        refreshToken: true,
        ipAddress: true,
        userAgent: true,
      },
    });
    return session;
  }

  /**
   * Gets a session of the user's device by user ID and user agent
   * @param {PrismaClient} prisma - PrismaClient instance
   * @param {TGetDeviceSessionParams} params - Session parameters
   * @param {string} params.userId - User ID
   * @param {string | undefined} params.userAgent - User agent
   * @returns {Promise<TDeviceSession | null>} Session object or null if not found
   */
  async getDeviceSession(
    prisma: PrismaClient,
    { userId, userAgent }: TGetDeviceSessionParams,
  ): Promise<TDeviceSession | null> {
    const session = await prisma.session.findFirst({
      where: {
        userId,
        userAgent: userAgent ?? null,
      },
      select: {
        id: true,
        refreshToken: true,
      },
    });
    return session;
  }

  /**
   * Creates a new session and returns a session response
   * @param {PrismaClient} prisma - PrismaClient instance
   * @param {TCreateSessionParams} params - Session parameters
   * @param {string} params.userId - User ID
   * @param {string | undefined} params.ipAddress - User IP address
   * @param {string | undefined} params.userAgent - User agent
   * @returns {Promise<TSessionResponse>} Session object
   */
  async createSession(
    prisma: PrismaClient,
    { userId, ipAddress, userAgent }: TCreateSessionParams,
  ): Promise<TSessionResponse> {
    const refreshToken = jwtService.issueRefreshToken();

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

  /**
   * Rotates the refresh token of a session and updates its IP address
   * @param {PrismaClient} prisma - PrismaClient instance
   * @param {TRotateSessionParams} params - Rotation parameters
   * @param {string} params.sessionId - Session ID
   * @param {string | undefined} params.ipAddress - Current user IP address
   * @returns {Promise<TSessionResponse>} Session object with the new refresh token
   */
  async rotateSession(
    prisma: PrismaClient,
    { sessionId, ipAddress }: TRotateSessionParams,
  ): Promise<TSessionResponse> {
    const refreshToken = jwtService.issueRefreshToken();

    const session = await prisma.session.update({
      where: {
        id: sessionId,
      },
      data: {
        refreshToken,
        ipAddress,
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
