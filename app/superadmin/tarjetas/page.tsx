import React from "react";
import { headers } from "next/headers";
import { prisma } from "../../../lib/prisma";
import { requireSuperAdmin } from "../../../lib/permissions";
import TarjetasClient from "./TarjetasClient";

export const dynamic = "force-dynamic";

export default async function SuperadminTarjetasPage() {
  await requireSuperAdmin();

  const headersList = await headers();
  const originHost = headersList.get("host") || "localhost:3000";

  // Consultar todas las empresas para asociar o filtrar
  const companies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
      slug: true
    },
    orderBy: { name: "asc" }
  });

  // Consultar el catálogo de tarjetas físicas con sus relaciones de destino
  const physicalCards = await prisma.physicalNfcCard.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      },
      card: {
        select: {
          id: true,
          slug: true,
          name: true
        }
      },
      localTouchpoint: {
        select: {
          id: true,
          code: true,
          name: true,
          campaign: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      }
    }
  });

  return (
    <TarjetasClient
      cards={physicalCards as any}
      companies={companies}
      originHost={originHost}
    />
  );
}
