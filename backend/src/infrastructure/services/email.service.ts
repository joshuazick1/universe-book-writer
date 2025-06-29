import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { EmailService } from '../../core/interfaces/email.service.js';

/**
 * Email service implementation using Nodemailer
 * Implements core email service interface
 */
export class NodemailerEmailService implements EmailService {
    private transporter: Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'localhost',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    /**
     * Send email verification
     */
    async sendEmailVerification(email: string, token: string): Promise<void> {
        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || 'noreply@universe-book-writer.com',
                to: email,
                subject: 'Verify Your Email Address',
                html: `
          <h1>Email Verification</h1>
          <p>Hello,</p>
          <p>Please verify your email address by clicking the link below:</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}">
            Verify Email Address
          </a>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't request this verification, please ignore this email.</p>
        `,
            };

            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            console.error('Failed to send email verification:', error);
            throw error;
        }
    }

    /**
     * Send verification email (alias for sendEmailVerification)
     */
    async sendVerificationEmail(email: string, token: string): Promise<void> {
        return this.sendEmailVerification(email, token);
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(email: string, token: string): Promise<void> {
        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || 'noreply@universe-book-writer.com',
                to: email,
                subject: 'Reset Your Password',
                html: `
          <h1>Password Reset</h1>
          <p>Hello,</p>
          <p>You requested to reset your password. Click the link below to reset it:</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}">
            Reset Password
          </a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this reset, please ignore this email.</p>
        `,
            };

            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            console.error('Failed to send password reset email:', error);
            throw error;
        }
    }

    /**
     * Send login notification email
     */
    async sendLoginNotification(
        email: string,
        deviceInfo: {
            userAgent?: string;
            ip?: string;
            deviceId?: string;
        }
    ): Promise<void> {
        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || 'noreply@universe-book-writer.com',
                to: email,
                subject: 'New Login Detected',
                html: `
          <h1>New Login Detected</h1>
          <p>Hello,</p>
          <p>We detected a new login to your account:</p>
          <ul>
            <li><strong>Device:</strong> ${deviceInfo.userAgent || 'Unknown'}</li>
            <li><strong>IP Address:</strong> ${deviceInfo.ip || 'Unknown'}</li>
            <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
          </ul>
          <p>If this wasn't you, please secure your account immediately.</p>
        `,
            };

            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            console.error('Failed to send login notification:', error);
            throw error;
        }
    }

    /**
     * Send security alert email
     */
    async sendSecurityAlert(
        email: string,
        alertType: string,
        details: Record<string, unknown>
    ): Promise<void> {
        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || 'noreply@universe-book-writer.com',
                to: email,
                subject: `Security Alert: ${alertType}`,
                html: `
          <h1>Security Alert</h1>
          <p>Hello,</p>
          <p>We detected a security-related event on your account:</p>
          <p><strong>Alert Type:</strong> ${alertType}</p>
          <p><strong>Details:</strong></p>
          <pre>${JSON.stringify(details, null, 2)}</pre>
          <p>If this was not authorized by you, please contact support immediately.</p>
        `,
            };

            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            console.error('Failed to send security alert:', error);
            throw error;
        }
    }

    /**
     * Send collaboration invitation email
     */
    async sendCollaborationInvitation(
        email: string,
        inviterName: string,
        universeName: string,
        role: string,
        invitationToken: string,
        message?: string
    ): Promise<void> {
        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || 'noreply@universe-book-writer.com',
                to: email,
                subject: `Invitation to collaborate on "${universeName}"`,
                html: `
          <h1>Collaboration Invitation</h1>
          <p>Hello,</p>
          <p><strong>${inviterName}</strong> has invited you to collaborate on the universe "<strong>${universeName}</strong>" as a <strong>${role}</strong>.</p>
          ${message ? `<p><em>Message from ${inviterName}:</em> ${message}</p>` : ''}
          <p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/invitation?token=${invitationToken}">
              Accept Invitation
            </a>
          </p>
          <p>This invitation will expire in 7 days.</p>
          <p>If you don't want to collaborate on this universe, you can safely ignore this email.</p>
        `,
            };

            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            console.error('Failed to send collaboration invitation:', error);
            throw error;
        }
    }

    /**
     * Send collaboration notification email (when user is added directly)
     */
    async sendCollaborationNotification(
        email: string,
        inviterName: string,
        universeName: string,
        role: string,
        message?: string
    ): Promise<void> {
        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || 'noreply@universe-book-writer.com',
                to: email,
                subject: `You've been added to collaborate on "${universeName}"`,
                html: `
          <h1>Collaboration Access Granted</h1>
          <p>Hello,</p>
          <p><strong>${inviterName}</strong> has added you as a collaborator on the universe "<strong>${universeName}</strong>" with the role of <strong>${role}</strong>.</p>
          ${message ? `<p><em>Message from ${inviterName}:</em> ${message}</p>` : ''}
          <p>You can now access this universe in your dashboard.</p>
          <p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/universes">
              View Universe
            </a>
          </p>
          <p>If you don't want to collaborate on this universe, you can leave it from your universe dashboard.</p>
        `,
            };

            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            console.error('Failed to send collaboration notification:', error);
            throw error;
        }
    }

    /**
     * Send collaboration removal notification email
     */
    async sendCollaborationRemovalNotification(
        email: string,
        removerName: string,
        universeName: string
    ): Promise<void> {
        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || 'noreply@universe-book-writer.com',
                to: email,
                subject: `Removed from collaboration on "${universeName}"`,
                html: `
          <h1>Collaboration Access Removed</h1>
          <p>Hello,</p>
          <p><strong>${removerName}</strong> has removed you from collaborating on the universe "<strong>${universeName}</strong>".</p>
          <p>You no longer have access to this universe.</p>
          <p>If you believe this was done in error, please contact the universe owner.</p>
        `,
            };

            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            console.error('Failed to send collaboration removal notification:', error);
            throw error;
        }
    }

    /**
     * Send bulk email (for notifications, newsletters, etc.)
     */
    async sendBulkEmail(
        recipients: string[],
        subject: string,
        htmlContent: string,
        textContent?: string
    ): Promise<void> {
        try {
            const promises = recipients.map(email => {
                const mailOptions = {
                    from: process.env.EMAIL_FROM || 'noreply@universe-book-writer.com',
                    to: email,
                    subject,
                    html: htmlContent,
                    text: textContent,
                };

                return this.transporter.sendMail(mailOptions);
            });

            await Promise.all(promises);
        } catch (error) {
            console.error('Failed to send bulk email:', error);
            throw error;
        }
    }
}
