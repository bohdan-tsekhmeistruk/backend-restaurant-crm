import { createTransport, type SentMessageInfo } from "nodemailer";

class EmailService {
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
