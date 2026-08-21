import React from "react";
import { prisma } from "../../../lib/prisma";
import { requireSuperAdmin } from "../../../lib/permissions";
import TarjetasClient from "./TarjetasClient";
import { PUBLIC_APP_ORIGIN } from "../../../lib/public-url";

export const dynamic = "force-dynamic";

export default async function SuperadminTarjetasPage() {
  await requireSuperAdmin();

  const originHost = new URL(PUBLIC_APP_ORIGIN).host;

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
