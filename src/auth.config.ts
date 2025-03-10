import type { DefaultSession, NextAuthOptions } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcrypt"
import { prisma } from "@/lib/prisma"

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string
      role: "ADMIN" | "USER"
    } & DefaultSession["user"]
  }
}

export const authConfig: NextAuthOptions = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
    async session({ token, session }) {
      if (token) {
        session.user.role = token.role as "ADMIN" | "USER"
      }
      return session
    }
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        
        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })
        
        if (!user || !user.hashedPassword) return null
        
        const isValid = await compare(credentials.password, user.hashedPassword)
        
        if (!isValid) return null
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    })
  ]
} 