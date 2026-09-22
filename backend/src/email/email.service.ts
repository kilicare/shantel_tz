import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('email.smtp.host'),
      port: this.configService.get('email.smtp.port'),
      secure: this.configService.get('email.smtp.secure'),
      auth: {
        user: this.configService.get('email.smtp.user'),
        pass: this.configService.get('email.smtp.password'),
      },
    });
  }

  async sendPasswordResetEmail(email: string, otp: string): Promise<void> {
    try {
      const mailOptions = {
        from: this.configService.get('email.from'),
        to: email,
        subject: 'Shantel - Password Reset Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Shantel</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">Sales Operations</p>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
              <p style="color: #666; line-height: 1.6;">You requested to reset your password for your Shantel account. Use the following one-time password (OTP) to proceed:</p>
              <div style="background: white; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0; border: 2px solid #667eea;">
                <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px;">${otp}</span>
              </div>
              <p style="color: #666; line-height: 1.6;">This code will expire in 15 minutes. If you didn't request this, please ignore this email.</p>
              <p style="color: #666; font-size: 12px; margin-top: 30px;">For security, please don't share this code with anyone.</p>
            </div>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}:`, error);
      throw error;
    }
  }
}
