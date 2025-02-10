"use strict";
const { hash } = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function main() {
    const email = process.argv[2];
    const password = process.argv[3];
    const name = process.argv[4] || 'Admin';
    if (!email || !password) {
        console.error('Bitte E-Mail und Passwort angeben');
        console.error('Verwendung: npm run create-admin email@example.com password "Admin Name"');
        process.exit(1);
    }
    try {
        const hashedPassword = await hash(password, 12);
        const user = await db.user.create({
            data: {
                email,
                name,
                hashedPassword,
                role: 'ADMIN'
            }
        });
        console.log('Admin-Benutzer erfolgreich erstellt:', user);
    }
    catch (error) {
        console.error('Fehler beim Erstellen des Admin-Benutzers:', error);
        process.exit(1);
    }
    finally {
        await db.$disconnect();
    }
}
main();
