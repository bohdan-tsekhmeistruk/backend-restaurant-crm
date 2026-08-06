import type { PrismaClient } from "src/generated/prisma/client.js";
import {
  UserAuthSelect,
  type TAuthResponse,
  type TRefreshTokenResponse,
} from "./interfaces/auth.interface.js";
import bcrypt from "bcrypt";
import sessionsService from "src/v1/modules/sessions/sessions.service.js";
import type { TEnv } from "src/lib/dto/env.dto.js";
import jwtService from "./jwt.service.js";
import type {
  TLoginParams,
  TRefreshTokenParams,
  TRegisterParams,
} from "./dto/auth.dto.js";
import errorHandler from "src/lib/error.handler.js";

class AuthService {
  /**
   * Authenticates a user and returns a login response
   * @param {PrismaClient} prisma - PrismaClient instance
   * @param {TLoginParams} params - Login parameters
   * @param {string} params.email - User email
   * @param {string} params.password - User password
   * @param {string | undefined} params.ipAddress - User IP address
   * @param {string | undefined} params.userAgent - User agent
   * @returns {Promise<TAuthResponse>} Auth response object
   */
  async login(
    prisma: PrismaClient,
    envVars: TEnv,
    { email, password, ipAddress, userAgent }: TLoginParams,
  ): Promise<TAuthResponse> {
    // Find the user by email
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: UserAuthSelect,
    });
    if (!user) {
      throw errorHandler.httpError(401, "Invalid credentials");
    }

    // Check if the password is valid
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw errorHandler.httpError(401, "Invalid credentials");
    }

    // Delete the password from the user object to avoid sending it to the client
    delete (user as any).password;

    // Reuse the session of this device or create a new one
    const deviceSession = await sessionsService.getDeviceSession(prisma, {
      userId: user.id,
      userAgent,
    });

    // Rotate the refresh token of the existing session or create a new session
    const session = deviceSession
      ? await sessionsService.rotateSession(prisma, {
          sessionId: deviceSession.id,
          ipAddress,
        })
      : await sessionsService.createSession(prisma, {
          userId: user.id,
          ipAddress,
          userAgent,
        });

    // Generate the access token
    const accessToken = await jwtService.issueToken(
      user.id,
      envVars.ACCESS_TOKEN_SECRET,
    );

    return {
      user,
      accessToken: accessToken,
      refreshToken: session.refreshToken,
    };
  }

  /**
   * Registers a new user and returns a login response
   * @param {PrismaClient} prisma - PrismaClient instance
   * @param {TRegisterParams} params - Register parameters
   * @param {string} params.email - User email
   * @param {string} params.password - User password
   * @param {string} params.firstName - User first name
   * @param {string} params.lastName - User last name
   * @param {string} params.phone - User phone
   * @param {string | undefined} params.ipAddress - User IP address
   * @param {string | undefined} params.userAgent - User agent
   * @returns {Promise<TAuthResponse>} Auth response object
   */
  async register(
    prisma: PrismaClient,
    envVars: TEnv,
    {
      email,
      password,
      firstName,
      lastName,
      phone,
      ipAddress,
      userAgent,
    }: TRegisterParams,
  ): Promise<TAuthResponse> {
    // Check if the user already exists
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: { id: true },
    });
    if (user) {
      throw errorHandler.httpError(400, "User already exists");
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(
      password,
      parseInt(process.env.PASSWORD_SALT_ROUNDS ?? "12", 10),
    );

    // Create a new user with an empty cart
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,

        firstName,
        lastName,
        phone,

        cart: {
          create: {},
        },
      },
      select: UserAuthSelect,
    });

    // Delete the password from the user object to avoid sending it to the client
    delete (newUser as any).password;

    // Create a new session
    const session = await sessionsService.createSession(prisma, {
      userId: newUser.id,
      ipAddress,
      userAgent,
    });

    // Generate the access token
    const accessToken = await jwtService.issueToken(
      newUser.id,
      envVars.ACCESS_TOKEN_SECRET,
    );

    return {
      user: newUser,
      accessToken: accessToken,
      refreshToken: session.refreshToken,
    };
  }

  /**
   * Refreshes a token and returns a login response
   * @param {PrismaClient} prisma - PrismaClient instance
   * @param {TEnv} envVars - Environment variables
   * @param {TRefreshTokenParams} params - Refresh token parameters
   * @param {string} params.refreshToken - Refresh token
   * @param {string | undefined} params.ipAddress - User IP address
   * @param {string | undefined} params.userAgent - User agent
   * @returns {Promise<TRefreshTokenResponse>} Auth response object
   */
  async refreshToken(
    prisma: PrismaClient,
    envVars: TEnv,
    { refreshToken, ipAddress, userAgent }: TRefreshTokenParams,
  ): Promise<TRefreshTokenResponse> {
    // Get the session by refresh token
    const session = await sessionsService.getSessionByRefreshToken(
      prisma,
      refreshToken,
    );
    if (!session) {
      throw errorHandler.httpError(401, "Unauthorized");
    }

    // Check that the session is used from the same device
    if (session.userAgent && session.userAgent !== userAgent) {
      throw errorHandler.httpError(401, "Unauthorized");
    }

    // Check that the user still exists
    const user = await prisma.user.findUnique({
      where: {
        id: session.userId,
      },
      select: {
        id: true,
      },
    });
    if (!user) {
      throw errorHandler.httpError(401, "Unauthorized");
    }

    // Rotate the refresh token and update the session IP address
    const rotatedSession = await sessionsService.rotateSession(prisma, {
      sessionId: session.id,
      ipAddress,
    });

    // Generate the access token
    const accessToken = await jwtService.issueToken(
      user.id,
      envVars.ACCESS_TOKEN_SECRET,
    );

    return {
      accessToken: accessToken,
      refreshToken: rotatedSession.refreshToken,
    };
  }
  /**
   * Logs out a user by deleting the session of the given refresh token
   * @param {PrismaClient} prisma - PrismaClient instance
   * @param {string} refreshToken - Refresh token of the session to delete
   * @returns {Promise<void>}
   */
  async logout(prisma: PrismaClient, refreshToken: string): Promise<void> {
    await sessionsService.deleteSession(prisma, refreshToken);
  }
}

export default new AuthService();
