/* eslint-disable @typescript-eslint/no-explicit-any */
import { hashIp } from "../../../../lib/security";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { LeadInteractionType, ContactSource } from "@prisma/client";
import { checkRateLimit } from "../../../../lib/rateLimit";

function clean(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string): string {
  // Eliminar espacios, guiones, paréntesis y cualquier carácter no numérico excepto +
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, "");
  
  // Si tiene 9 dígitos y empieza con 9 (ej. 912345678), asumimos que es número chileno y prepende 56
  if (cleaned.length === 9 && cleaned.startsWith("9")) {
    cleaned = "56" + cleaned;
  }
  // Si empieza con 09 y tiene 10 dígitos (ej. 0912345678), quitar el 0 inicial y prepende 56
  else if (cleaned.length === 10 && cleaned.startsWith("09")) {
    cleaned = "56" + cleaned.substring(1);
  }
  
  return cleaned;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cardId = clean(body.cardId);

    // 1. Obtener dirección IP y aplicar Rate Limit persistente
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || 
               request.headers.get("x-real-ip") || 
               "unknown";

    const { allowed } = await checkRateLimit(ip, "PUBLIC_LEAD_CAPTURE", cardId || undefined);
    if (!allowed) {
      console.warn(`[RATE_LIMIT] IP bloqueada por exceso de peticiones: ${ip}`);
      return NextResponse.json(
        { error: "Límite de solicitudes excedido. Intente nuevamente en unos minutos." },
        { status: 429 }
      );
    }

    // 2. Comprobar campo trampa (Honeypot)
    const nickname = clean(body.nickname);
    if (nickname !== "") {
      console.warn(`[HONEYPOT] Intento de bot descartado silenciosamente. IP: ${ip}, nickname: ${nickname}`);
      // Responder de forma neutra y no crear ningún registro (silent discard)
      return NextResponse.json({
        ok: true,
        leadId: "honeypot-discarded",
      });
    }

    const name = clean(body.name);
    const company = clean(body.company);
    const position = clean(body.position);
    const email = clean(body.email);
    const phone = clean(body.phone);
    const message = clean(body.message);
    const consentAccepted = !!body.consentAccepted;
    const consentText = clean(body.consentText) || null;
    const sourceParam = clean(body.source) || "";

    if (!cardId || !name || !phone) {
      return NextResponse.json(
        { error: "Nombre, teléfono y tarjeta son obligatorios." },
        { status: 400 }
      );
    }

    // Normalizar correo y teléfono de forma consistente
    const normEmail = email ? normalizeEmail(email) : null;
    const normPhone = normalizePhone(phone);

    // Validación de formato de correo básico (solo si se proporciona)
    if (normEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normEmail)) {
        return NextResponse.json(
          { error: "Formato de correo electrónico inválido." },
          { status: 400 }
        );
      }
    }

    // 3. Ejecutar transacciones analíticas y persistencia
    const result = await prisma.$transaction(async (tx) => {
      const card = await tx.card.findUnique({
        where: { id: cardId },
        select: { id: true, isActive: true, companyId: true },
      });

      if (!card || !card.isActive) {
        throw new Error("NOT_FOUND");
      }

      const companyId = card.companyId;

      // Determinar Origen
      let source: ContactSource = ContactSource.DIRECT;
      if (sourceParam === "NFC" || sourceParam === "nfc" || sourceParam === "nfc_scan") {
        source = ContactSource.NFC;
      } else if (sourceParam === "QR" || sourceParam === "qr" || sourceParam === "qr_scan") {
        source = ContactSource.QR;
      }

      // Buscar leads existentes para desduplicación scoped por empresa (companyId)
      const existingLeadByEmail = normEmail 
        ? await tx.lead.findFirst({ where: { companyId, email: normEmail } })
        : null;

      const existingLeadByPhone = await tx.lead.findFirst({ 
        where: { companyId, phone: normPhone } 
      });

      // Validaciones transaccionales de consistencia multiempresa
      if (existingLeadByEmail && existingLeadByEmail.companyId !== companyId) {
        throw new Error("INCONSISTENT_COMPANY");
      }
      if (existingLeadByPhone && existingLeadByPhone.companyId !== companyId) {
        throw new Error("INCONSISTENT_COMPANY");
      }

      let targetLeadId: string;
      let interactionType: LeadInteractionType = LeadInteractionType.CONTACT_CAPTURE;
      let conflictMsg = "";

      // Conflicto de identidad: El email pertenece a un lead A y el teléfono a un lead B
      if (existingLeadByEmail && existingLeadByPhone && existingLeadByEmail.id !== existingLeadByPhone.id) {
        conflictMsg = `Conflicto de identidad: el email coincide con el lead '${existingLeadByEmail.name}' y el teléfono con el lead '${existingLeadByPhone.name}'.`;
        
        // No fusionar: Crear un nuevo lead para no corromper ninguno de los existentes
        const newLead = await tx.lead.create({
          data: {
            cardId,
            companyId,
            name,
            company: company || null,
            position: position || null,
            email: normEmail,
            phone: normPhone,
            message: message || null,
            identityConflict: true,
            conflictDetails: conflictMsg,
            ipHash: hashIp(ip),
          },
        });
        targetLeadId = newLead.id;
      } 
      // Coincidencia por Teléfono
      else if (existingLeadByPhone) {
        targetLeadId = existingLeadByPhone.id;
        interactionType = LeadInteractionType.RE_ENGAGEMENT;

        // Actualizar de forma conservadora
        const updateData: any = {};
        if (!existingLeadByPhone.email && normEmail) updateData.email = normEmail;
        if (!existingLeadByPhone.company && company) updateData.company = company;
        if (!existingLeadByPhone.position && position) updateData.position = position;

        if (Object.keys(updateData).length > 0) {
          await tx.lead.update({
            where: { id: targetLeadId },
            data: updateData,
          });
        }
      } 
      // Coincidencia por Email
      else if (existingLeadByEmail) {
        targetLeadId = existingLeadByEmail.id;
        interactionType = LeadInteractionType.RE_ENGAGEMENT;

        // Actualizar campos vacíos de forma conservadora
        const updateData: any = {};
        if (!existingLeadByEmail.phone && normPhone) updateData.phone = normPhone;
        if (!existingLeadByEmail.company && company) updateData.company = company;
        if (!existingLeadByEmail.position && position) updateData.position = position;

        if (Object.keys(updateData).length > 0) {
          await tx.lead.update({
            where: { id: targetLeadId },
            data: updateData,
          });
        }
      } 
      // Ninguna coincidencia: Lead completamente nuevo
      else {
        const newLead = await tx.lead.create({
          data: {
            cardId,
            companyId,
            name,
            company: company || null,
            position: position || null,
            email: normEmail,
            phone: normPhone,
            message: message || null,
            ipHash: hashIp(ip),
          },
        });
        targetLeadId = newLead.id;
      }

      // Registrar la interacción histórica
      await tx.leadInteraction.create({
        data: {
          leadId: targetLeadId,
          cardId,
          companyId,
          type: interactionType,
          source,
          message: message || null,
          consentAccepted,
          consentText,
          consentAt: consentAccepted ? new Date() : null,
        },
      });

      // Registrar evento analítico global
      await tx.event.create({
        data: {
          cardId,
          eventType: "CONTACT_SHARED",
          ipHash: hashIp(ip),
          userAgent: request.headers.get("user-agent"),
          referer: request.headers.get("referer"),
        },
      });

      return targetLeadId;
    });

    return NextResponse.json({
      ok: true,
      leadId: result,
    });
  } catch (error: any) {
    if (error.message === "NOT_FOUND") {
      return NextResponse.json(
        { error: "La tarjeta no existe o no está activa." },
        { status: 404 }
      );
    }
    console.error("Error creando lead:", error);
    return NextResponse.json(
      { error: "No pudimos guardar tus datos." },
      { status: 500 }
    );
  }
}