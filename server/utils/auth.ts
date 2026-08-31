import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { db } from '~~/server/database'

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: 'postgresql'
  }),
  user: {
    modelName: 'User',
    fields: {
      emailVerified: 'emailVerified',
      image: 'image'
    },
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'patient',
        input: false
      },
      monitorClinicId: {
        type: 'string',
        required: false,
        input: false
      }
    }
  },
  session: {
    modelName: 'Session'
  },
  account: {
    modelName: 'Account'
  },
  verification: {
    modelName: 'Verification'
  },
  emailAndPassword: {
    enabled: true
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'],
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL
})
