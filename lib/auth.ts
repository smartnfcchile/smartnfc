// lib/auth.ts

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

const INVALID_PASSWORD_HASH = "$2b$12$s4Q7twpmn.CVd1mJvzSqbuzLdAcA4rMqyt0HE34ANuUwLgiv0G2Pa";

if (process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_SECRET) {
  throw new Error("NEXTAUTH_SECRET es obligatorio en producción.");
}

export const authOptions: NextAuthOptions = {
  // 1. ¿Cómo van a iniciar sesión? (En nuestro caso: Correo y Contraseña)
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Correo", type: "email", placeholder: "tu@empresa.com" },
        password: { label: "Contraseña", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const email = credentials.email.trim().toLowerCase();
          const user = await prisma.user.findUnique({
            where: { email },
            include: { company: { select: { isActive: true } } },
          });

          // La comparación ficticia evita revelar por tiempo de respuesta si el
          // correo existe. Todos los fallos producen la misma respuesta.
          const isValid = await bcrypt.compare(
            credentials.password,
            user?.password || INVALID_PASSWORD_HASH
          );
          if (!user || !user.password || !isValid || !user.isActive || user.status !== "ACTIVE" || !user.company.isActive) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            companyId: user.companyId,
          };

        } catch {
          return null;
        }
      }
    })
  ],
  
  // 3. Los "Callbacks": Aquí armamos la pulsera VIP (la sesión)
  callbacks: {
    // Primero creamos un token interno...
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.companyId = (user as any).companyId;
      }
      return token;
    },
    // ...y luego pasamos esos datos a la sesión pública que leerá el navegador
    async session({ session, token }) {
      if (token && session.user) {
        // Usamos 'any' temporalmente para no complicarnos con TypeScript avanzado ahora mismo
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).companyId = token.companyId;
      }
      return session;
    }
  },
  
  // 4. Configuraciones extra
  pages: {
    signIn: "/login", // Más adelante crearemos nuestra propia pantalla bonita de login aquí
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET, // Nuestra contraseña maestra
};
