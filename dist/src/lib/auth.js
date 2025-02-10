import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { compare } from "bcrypt";
export const authOptions = {
    session: {
        strategy: "jwt"
    },
    pages: {
        signIn: "/login",
    },
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }
                try {
                    const user = await prisma.user.findUnique({
                        where: {
                            email: credentials.email
                        }
                    });
                    if (!user || !user.hashedPassword) {
                        return null;
                    }
                    const isPasswordValid = await compare(credentials.password, user.hashedPassword);
                    if (!isPasswordValid) {
                        return null;
                    }
                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                    };
                }
                catch (error) {
                    console.error("[AUTH_ERROR]", error);
                    return null;
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
            }
            return token;
        },
        async session({ token, session }) {
            if (token) {
                session.user.id = token.id;
                session.user.name = token.name;
                session.user.email = token.email;
                session.user.role = token.role;
            }
            return session;
        }
    }
};
