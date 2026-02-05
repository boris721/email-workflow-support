import nodemailer from 'nodemailer';

export class SmtpService {
  /**
   * @param {object} config - SMTP configuration { host, port, user, pass }
   * @param {object} [logger] - Optional logger
   */
  constructor(config, logger = console) {
    this.config = config;
    this.logger = logger;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure !== false, // Default to true
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  }

  /**
   * Verify SMTP connection
   * @returns {Promise<boolean>}
   */
  async verify() {
    try {
      await this.transporter.verify();
      this.logger.log(`✅ SMTP Connected: ${this.config.host}`);
      return true;
    } catch (err) {
      this.logger.error('❌ SMTP Connection failed:', err.message);
      return false;
    }
  }

  /**
   * Send an email
   * @param {object} options
   * @param {string} options.to
   * @param {string} options.subject
   * @param {string} options.text
   * @param {string} [options.inReplyTo]
   * @param {string|string[]} [options.references]
   * @returns {Promise<object>} Nodemailer info
   */
  async send({ to, subject, text, inReplyTo, references }) {
    const mailOptions = {
      from: `"Support" <${this.config.user}>`, // TODO: Make name configurable
      to,
      subject,
      text,
      ...(inReplyTo && { inReplyTo }),
      ...(references && { references }),
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`📧 Sent email to ${to} (ID: ${info.messageId})`);
      return info;
    } catch (err) {
      this.logger.error(`❌ Failed to send email to ${to}:`, err.message);
      throw err;
    }
  }
}
