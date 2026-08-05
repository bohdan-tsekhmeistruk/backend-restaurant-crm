import { createTransport, type SentMessageInfo } from "nodemailer";
import type { EAvailableTemplates } from "src/lib/dto/templates.dto.js";
import templatesService from "src/lib/templates.service.js";

class EmailService {
  /**
   * Send email with template name
   * @param {string} emailTo - Email to
   * @param {EAvailableTemplates} templateName - Template name
   * @param {Record<string, any>} data - Data for template
   * @returns {Promise<SentMessageInfo>} Return sent message info
   */
  async sendEmailWithTemplate(
    emailTo: string,
    templateName: EAvailableTemplates,
    data: Record<string, any>,
  ): Promise<SentMessageInfo> {
    const template = await templatesService.getTemplate(templateName);
    const html = template.html.replace(
      /{{(.*?)}}/g,
      (match: string, p1: string) => data[p1] || match,
    );
    return this.sendEmail(
      emailTo,
      template.subject,
      html,
    );
  }

  /**
   * Send email
   * @param {string} emailTo - Email to
   * @param {string} subject - Subject
   * @param {string} html - HTML
   * @returns {Promise<SentMessageInfo>} Return sent message info
   */
  async sendEmail(
    emailTo: string,
    subject: string,
    html: string,
  ): Promise<SentMessageInfo> {
    const transporter = createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: emailTo,
      subject: subject,
      html: html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Message sent: ", info.messageId);
    return info;
  }
}

export default new EmailService();
