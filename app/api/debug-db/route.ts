// app/api/debug-db/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    // 1. Probamos conexión básica
    const userCount = await prisma.user.count();
    
    // 2. Buscamos el usuario
    const user = await prisma.user.findUnique({
      where: { email: "agustin@demo.cl" },
    });

    if (!user) {
      return NextResponse.json({
        status: "success",
        connection: "ok",
        message: "Conexión exitosa, pero el usuario agustin@demo.cl NO existe en la base de datos de Vercel.",
        totalUsers: userCount,
      });
    }

    // 3. Verificamos la contraseña
    const passwordOk = await bcrypt.compare("Agustin1234", user.password || "");

    return NextResponse.json({
      status: "success",
      connection: "ok",
      userFound: true,
      email: user.email,
      name: user.name,
      role: user.role,
      passwordMatchesAgustin1234: passwordOk,
      totalUsers: userCount,
      databaseUrlConfigured: process.env.DATABASE_URL ? "Configurada (oculta por seguridad)" : "NO CONFIGURADA",
    });

  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      connection: "failed",
      errorMessage: error.message || String(error),
      stack: error.stack,
    }, { status: 500 });
  }
}
