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

  const digitalCards = await prisma.card.findMany({
    orderBy: [{ company: { name: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      companyId: true,
      slug: true,
      name: true,
      profileName: true,
      isActive: true,
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  return (
    <TarjetasClient
      key={physicalCards.map(card => `${card.id}:${card.updatedAt.toISOString()}`).join("|")}
      cards={physicalCards}
      companies={companies}
      digitalCards={digitalCards}
      originHost={originHost}
    />
  );
}
