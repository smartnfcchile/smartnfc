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

  // Consultar la empresa por ID con sus licencias de producto
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      productLicenses: true,
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
    productLicenses: company.productLicenses.map((pl) => ({
      id: pl.id,
      product: pl.product,
      planCode: pl.planCode,
      status: pl.status,
      includedIdentities: pl.includedIdentities,
      authorizedExtraIdentities: pl.authorizedExtraIdentities,
      includedCampaigns: pl.includedCampaigns,
      includedBranches: pl.includedBranches,
      includedTouchpoints: pl.includedTouchpoints,
      startsAt: pl.startsAt ? pl.startsAt.toISOString().split("T")[0] : "",
      expiresAt: pl.expiresAt ? pl.expiresAt.toISOString().split("T")[0] : "",
      notes: pl.notes,
    })),
    users: company.users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      status: u.status,
    })),
  };

  return <CompanyDetailClient company={serializedCompany as any} />;
}
