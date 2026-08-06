export type TSessionResponse = {
  refreshToken: string;
};

export type TSession = {
  id: string;
  userId: string;
  refreshToken: string;
  ipAddress: string | null;
  userAgent: string | null;
};

export type TDeviceSession = {
  id: string;
  refreshToken: string;
};

export type TCreateSessionParams = {
  userId: string;
  ipAddress: string | undefined;
  userAgent: string | undefined;
};

export type TGetDeviceSessionParams = {
  userId: string;
  userAgent: string | undefined;
};

export type TRotateSessionParams = {
  sessionId: string;
  ipAddress: string | undefined;
};
