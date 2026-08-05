export type TTemplate = {
  subject: string;
  html: string;
};

export enum EAvailableTemplates {
  EMAIL_PASSWORD_RESET = "email_password_reset",
  EMAIL_VERIFICATION_CODE = "email_verification_code",
}
