export type TSessionResponse = {
  refreshToken: string;
};

export type TCreateSessionParams = {
  userId: string;
  ipAddress: string | undefined;
  userAgent: string | undefined;
};

export type TGetSessionParams = {
  userId: string;
  refreshToken?: string;
  ipAddress: string | undefined;
  userAgent: string | undefined;
};
