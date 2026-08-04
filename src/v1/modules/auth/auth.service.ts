import type { PrismaClient, User } from "src/generated/prisma/client.js";
import {
  UserAuthSelect,
  type TAuthResponse,
  type TRefreshTokenResponse,
} from "./interfaces/auth.interface.js";
import { HTTPException } from "hono/http-exception";
import bcrypt from "bcrypt";
import sessionsService from "src/v1/modules/sessions/sessions.service.js";
import type { TEnv } from "src/lib/dto/env.dto.js";
import jwtService from "./jwt.service.js";
import type {
  TLoginParams,
  TRefreshTokenParams,
  TRegisterParams,
} from "./dto/auth.dto.js";

const passwordSaltRounds = 12;

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
      throw new HTTPException(401, { message: "Invalid credentials" });
    }

    // Check if the password is valid
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new HTTPException(401, { message: "Invalid credentials" });
    }

    // Delete the password from the user object to avoid sending it to the client
    delete (user as any).password;

    // Get or create a new session
    let session = await sessionsService.getSession(prisma, {
      userId: user.id,
      ipAddress,
      userAgent,
    });
    if (!session) {
      session = await sessionsService.createSession(prisma, envVars, {
        userId: user.id,
        ipAddress,
        userAgent,
      });
    }

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
      throw new HTTPException(400, { message: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, passwordSaltRounds);

    // Create a new user
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,

        firstName,
        lastName,
        phone,
      },
      select: UserAuthSelect,
    });

    // Delete the password from the user object to avoid sending it to the client
    delete (newUser as any).password;

    // Create a new session
    const session = await sessionsService.createSession(prisma, envVars, {
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
    user: User,
    { refreshToken, ipAddress, userAgent }: TRefreshTokenParams,
  ): Promise<TRefreshTokenResponse> {
    // Get the session by refresh token
    const session = await sessionsService.getSession(prisma, {
      userId: user.id,
      refreshToken,
      ipAddress,
      userAgent,
    });
    if (!session) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    // Generate the access token
    const accessToken = await jwtService.issueToken(
      user.id,
      envVars.ACCESS_TOKEN_SECRET,
    );

    return {
      accessToken: accessToken,
      refreshToken: session.refreshToken,
    };
  }
}

export default new AuthService();
