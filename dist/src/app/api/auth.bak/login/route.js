import { prisma } from "@/lib/prisma";
import { compare } from "bcrypt";
import { NextResponse } from "next/server";
export async function POST(request) {
    try {
        const body = await request.json();
        const { email, password } = body;
        console.log('Login attempt for:', email);
        if (!email || !password) {
            console.log('Missing credentials');
            return new NextResponse("Fehlende Anmeldedaten", { status: 400 });
        }
        const user = await prisma.user.findFirst({
            where: {
                email: email
            }
        });
        console.log('User found:', !!user);
        if (!user || !user.hashedPassword) {
            console.log('Invalid credentials - user not found or no password');
            return new NextResponse("Ungültige Anmeldedaten", { status: 401 });
        }
        const isCorrectPassword = await compare(password, user.hashedPassword);
        console.log('Password correct:', isCorrectPassword);
        if (!isCorrectPassword) {
            console.log('Invalid credentials - wrong password');
            return new NextResponse("Ungültige Anmeldedaten", { status: 401 });
        }
        const response = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        };
        console.log('Login successful:', response);
        return NextResponse.json(response);
    }
    catch (error) {
        console.error("[AUTH_ERROR]", error);
        return new NextResponse("Interner Server-Fehler", { status: 500 });
    }
}
