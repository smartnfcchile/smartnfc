import React from "react";
import { prisma } from "../../../../lib/prisma";
import CompanyDetailClient from "./CompanyDetailClient";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    companyId: string;
  }>;
}

export default async function EmpresaDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const companyId = resolvedParams.companyId;

  // Consultar la empresa por ID (Requisito 6 y 8)
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      users: {
        orderBy: { createdAt: "asc" }
      },
      _count: {
        select: { cards: true }
      }
    }
  });

  if (!company) {
    notFound();
  }

  // Serializar fechas y relaciones para evitar problemas de paso de props
  const serializedCompany = {
    id: company.id,
    name: company.name,
    slug: company.slug,
    plan: company.plan,
    maxIdentities: company.maxIdentities,
    licenseStatus: company.licenseStatus,
    internalNotes: company.internalNotes,
    isActive: company.isActive,
    createdAt: company.createdAt.toISOString(),
    _count: company._count,
    users: company.users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
    })),
  };

  return <CompanyDetailClient company={serializedCompany} />;
}
