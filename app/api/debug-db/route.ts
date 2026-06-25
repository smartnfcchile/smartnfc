// app/api/debug-db/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const userCount = await prisma.user.count();
    const user = await prisma.user.findUnique({
      where: { email: "agustin@demo.cl" },
    });

    const passwordOk = user ? await bcrypt.compare("Agustin1234", user.password || "") : false;

    return NextResponse.json({
      status: "success",
      connection: "ok",
      userFound: !!user,
      passwordMatchesAgustin1234: passwordOk,
      totalUsers: userCount,
      env: {
        DATABASE_URL_set: !!process.env.DATABASE_URL,
        NEXTAUTH_SECRET_set: !!process.env.NEXTAUTH_SECRET,
        NEXTAUTH_URL_set: !!process.env.NEXTAUTH_URL,
        NEXTAUTH_URL_value: process.env.NEXTAUTH_URL || "no configurada",
        VERCEL_URL_value: process.env.VERCEL_URL || "no configurada",
        NODE_ENV: process.env.NODE_ENV,
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      connection: "failed",
      errorMessage: error.message || String(error),
    }, { status: 500 });
  }
}
