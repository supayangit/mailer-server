import dotenv from 'dotenv'
import { betterAuth } from 'better-auth'
import { bearer } from 'better-auth/plugins/bearer'
import { mongodbAdapter } from '@better-auth/mongo-adapter'
import { toNodeHandler } from 'better-auth/node'
import { db } from './db.js'
import { sendEmail } from '../emailService.js'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local', override: true })

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  database: mongodbAdapter(db),
  baseURL: process.env.BETTER_AUTH_URL,
  basePath: '/api/auth',
  appName: 'Mailer Server',
  trustedOrigins: [process.env.FRONTEND_URL || 'http://localhost:3000'],
  plugins: [bearer()],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        subject: 'Verify your email address',
        text: `Click the link to verify your email: ${url}`,
      })
    },
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },
  user: {
    additionalFields: {
      name: {
        type: 'string',
        required: false,
      },
    },
  },
})

export const authHandler = toNodeHandler(auth)
