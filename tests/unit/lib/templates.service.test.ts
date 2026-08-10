import { describe, expect, it } from "vitest";
import { HTTPException } from "hono/http-exception";
import templatesService from "src/lib/templates.service.js";
import { EAvailableTemplates } from "src/lib/dto/templates.dto.js";

describe("TemplatesService", () => {
  it("loads and parses a real template from disk", async () => {
    const template = await templatesService.getTemplate(
      EAvailableTemplates.EMAIL_VERIFICATION_CODE,
    );

    expect(template).toHaveProperty("subject");
    expect(template).toHaveProperty("html");
    expect(template.html).toContain("{{token}}");
  });

  it("loads the password reset template", async () => {
    const template = await templatesService.getTemplate(
      EAvailableTemplates.EMAIL_PASSWORD_RESET,
    );

    expect(template.subject).toBe("Password Reset");
  });

  it("throws an HTTPException 500 for a missing template", async () => {
    try {
      await templatesService.getTemplate("does_not_exist" as EAvailableTemplates);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      const response = (error as HTTPException).getResponse();
      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toMatchObject({
        message: expect.stringContaining("Template does_not_exist not found"),
      });
    }
  });
});
