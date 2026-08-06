import React from "react";
import { prisma } from "../../../lib/prisma";
import UsuariosListClient from "./UsuariosListClient";

export const dynamic = "force-dynamic";

export default async function SuperadminUsuariosPage() {
  // Consultar usuarios y empresas en servidor (Requisito 7 y 10)
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      company: {
        select: {
          id: true,
          name: true,
        }
      }
    }
  });

  const companies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: "asc" }
  });

  // Serializar fechas
  const serializedUsers = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    status: u.status,
    hasPassword: Boolean(u.password),
    createdAt: u.createdAt.toISOString(),
    companyId: u.companyId,
    company: u.company,
  }));

  return <UsuariosListClient initialUsers={serializedUsers} companies={companies} />;
}
