export type TLoginParams = {
  email: string;
  password: string;
  ipAddress: string | undefined;
  userAgent: string | undefined;
};

export type TRegisterParams = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  ipAddress: string | undefined;
  userAgent: string | undefined;
};

export type TRefreshTokenParams = {
  refreshToken: string;
  ipAddress: string | undefined;
  userAgent: string | undefined;
};
