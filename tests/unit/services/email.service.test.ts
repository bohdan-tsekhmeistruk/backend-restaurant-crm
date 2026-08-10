import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendMail: vi.fn(),
  createTransport: vi.fn(),
  getTemplate: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  createTransport: mocks.createTransport,
}));

vi.mock("src/lib/templates.service.js", () => ({
  default: { getTemplate: mocks.getTemplate },
}));

import emailService from "src/v1/modules/email/email.servie.js";
import { EAvailableTemplates } from "src/lib/dto/templates.dto.js";

describe("EmailService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail });
    mocks.sendMail.mockResolvedValue({ messageId: "msg-1", rejected: [] });
  });

  describe("sendEmail", () => {
    it("creates a gmail transporter with credentials from the env", async () => {
      await emailService.sendEmail("to@example.com", "Hi", "<b>Hi</b>");

      expect(mocks.createTransport).toHaveBeenCalledWith({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
      expect(mocks.sendMail).toHaveBeenCalledWith({
        from: process.env.EMAIL_USER,
        to: "to@example.com",
        subject: "Hi",
        html: "<b>Hi</b>",
      });
    });

    it("returns the sent message info", async () => {
      const info = await emailService.sendEmail("to@example.com", "s", "h");
      expect(info).toEqual({ messageId: "msg-1", rejected: [] });
    });
  });

  describe("sendEmailWithTemplate", () => {
    it("substitutes {{placeholders}} with the provided data", async () => {
      mocks.getTemplate.mockResolvedValue({
        subject: "Verify",
        html: "Hello {{name}}, your code is <b>{{token}}</b>",
      });

      await emailService.sendEmailWithTemplate(
        "to@example.com",
        EAvailableTemplates.EMAIL_VERIFICATION_CODE,
        { name: "John", token: "abc123" },
      );

      expect(mocks.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Verify",
          html: "Hello John, your code is <b>abc123</b>",
        }),
      );
    });

    it("keeps unknown placeholders untouched", async () => {
      mocks.getTemplate.mockResolvedValue({
        subject: "s",
        html: "Value: {{known}} / {{unknown}}",
      });

      await emailService.sendEmailWithTemplate(
        "to@example.com",
        EAvailableTemplates.EMAIL_PASSWORD_RESET,
        { known: "yes" },
      );

      expect(mocks.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ html: "Value: yes / {{unknown}}" }),
      );
    });
  });
});
