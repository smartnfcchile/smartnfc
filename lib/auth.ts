// lib/auth.ts

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  // 1. ¿Cómo van a iniciar sesión? (En nuestro caso: Correo y Contraseña)
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Correo", type: "email", placeholder: "tu@empresa.com" },
        password: { label: "Contraseña", type: "password" }
      },
      // 2. La función que verifica si el usuario existe y la contraseña es correcta
      async authorize(credentials) {
        console.log("--- INICIANDO DIAGNÓSTICO DE LOGIN ---");
        console.log("1. Correo:", credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Faltan datos.");
        }

        try {
          console.log("--> Intentando buscar en la base de datos...");
          
          // Aquí es donde sospechamos que el código se rompe
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });
          
          console.log("3. ¿Usuario encontrado?:", user ? "SÍ" : "NO");

          if (!user || !user.password) {
            throw new Error("Usuario no encontrado.");
          }

          console.log("--> Intentando comparar contraseñas...");
          const isValid = await bcrypt.compare(credentials.password, user.password);
          
          console.log("4. ¿Contraseña válida?:", isValid ? "SÍ" : "NO");

          if (!isValid) throw new Error("Contraseña incorrecta.");

          console.log("✅ Acceso concedido a:", user.email);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            companyId: user.companyId,
          };

        } catch (error) {
          // ¡Aquí atrapamos al culpable!
          console.log("\n🚨 ALERTA ROJA - ERROR INTERNO CAPTURADO:");
          console.log(error);
          console.log("----------------------------------------\n");
          throw error;
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
    strategy: "jwt", // Usamos tokens web seguros
  },
  secret: process.env.NEXTAUTH_SECRET, // Nuestra contraseña maestra
};