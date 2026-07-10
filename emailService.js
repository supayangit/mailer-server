import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  service: process.env.SMTP_SERVICE || 'gmail', // Optional: specify the email service
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

export async function sendEmail({ to, subject, text, html }) {
  try {
    const mailOption = {
      from: process.env.SMTP_FROM,
      to,
      subject,
      text,
      html,
    }
    const result = await transporter.sendMail(mailOption)
    console.log('Email sent:', result.messageId, 'to', to)
    return result
  } catch (error) {
    console.error('Failed to send email:', error)
    throw error
  }
}

export async function sendWelcomeEmail(email, name) {
  try {
    const mailOption = {
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Welcome to Mailer Server!',
      html: `
        <h1>Welcome, ${name || 'User'}!</h1>
        <p>Thank you for signing up. We're excited to have you on board.</p>
        <p>Start using your account today!</p>
      `,
    }
    const result = await transporter.sendMail(mailOption)
    console.log('Welcome email sent:', result.messageId)
    return result
  } catch (error) {
    console.error('Failed to send welcome email:', error)
    throw error
  }
}

export async function sendResetPasswordEmail(email, resetUrl) {
  try {
    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Reset Your Password',
      html: `
        <h1>Password Reset</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    })
    console.log('Reset password email sent:', result.messageId)
    return result
  } catch (error) {
    console.error('Failed to send reset password email:', error)
    throw error
  }
}
