import { z } from "zod";

// Helper para normalizar WhatsApp chileno a formato +569XXXXXXXX (Requisito 4)
export function normalizeChileanWhatsApp(value: string): string {
  if (!value) return "";
  
  // Remover todos los caracteres no numéricos excepto el signo + inicial
  let cleaned = value.replace(/[^\d+]/g, "");

  // Si tiene un + inicial, conservar sólo dígitos después del +
  if (cleaned.startsWith("+")) {
    cleaned = "+" + cleaned.replace(/\+/g, "");
  }

  // Casos comunes de formatos chilenos:
  // 1. 9XXXXXXXX -> +569XXXXXXXX
  // 2. 569XXXXXXXX -> +569XXXXXXXX
  // 3. +569XXXXXXXX -> +569XXXXXXXX
  if (cleaned.startsWith("+569") && cleaned.length === 12) {
    return cleaned;
  }
  if (cleaned.startsWith("569") && cleaned.length === 11) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith("9") && cleaned.length === 9) {
    return `+56${cleaned}`;
  }

  throw new Error("El número de WhatsApp ingresado es inválido para Chile. Debe ser de 9 dígitos (ej. 9XXXXXXXX) o incluir código de país.");
}

// Validación de color Hexadecimal (ej: #ffffff, #000, #ff00ff)
const hexColorSchema = z.string().regex(/^#([A-Fa-f0-9]{3}){1,2}$/, {
  message: "El color debe ser un valor hexadecimal válido (ej: #2563eb)."
});

// Validación de Slugs restringidos
export const slugSchema = z
  .string()
  .min(3, "El identificador URL (slug) debe tener al menos 3 caracteres.")
  .max(30, "El identificador URL (slug) no puede superar los 30 caracteres.")
  .regex(/^[a-z0-9-]+$/, "El identificador URL (slug) solo puede contener letras minúsculas, números y guiones.")
  .refine((val) => {
    const reserved = ["superadmin", "dashboard", "login", "api", "t", "c", "club", "configuracion", "editor", "leads", "metrics", "users", "cards", "qr"];
    return !reserved.includes(val);
  }, {
    message: "El identificador URL (slug) ingresado está reservado por el sistema."
  });

// Schema para creación de campaña (Requisito 5)
export const createCampaignSchema = z.object({
  name: z.string().min(3, "El nombre de la campaña debe tener al menos 3 caracteres.").max(100, "El nombre de la campaña no puede superar los 100 caracteres."),
  slug: slugSchema,
}).strict();

// Schema para actualización de campaña (Requisito 5)
export const updateCampaignSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres.").max(100),
  logoUrl: z.string().url("El logo debe ser una URL válida.").nullable().optional(),
  primaryColor: hexColorSchema,
  secondaryColor: hexColorSchema,
  businessName: z.string().max(100).nullable().optional(),
  clubName: z.string().max(50).nullable().optional(),
  headline: z.string().max(150).nullable().optional(),
  subheadline: z.string().max(300).nullable().optional(),
  address: z.string().max(200).nullable().optional(),
  whatsappNumber: z.string().nullable().optional(), // Será transformado/normalizado manualmente
  whatsappMessage: z.string().max(500, "El mensaje de WhatsApp no puede superar los 500 caracteres.").nullable().optional(),
  benefitLabel: z.string().max(50).nullable().optional(),
  benefitTitle: z.string().max(100).nullable().optional(),
  benefitDescription: z.string().max(500).nullable().optional(),
  benefitConditions: z.string().max(1000).nullable().optional(),
  benefitStartAt: z.preprocess((val) => val ? new Date(val as string) : null, z.date().nullable().optional()),
  benefitEndAt: z.preprocess((val) => val ? new Date(val as string) : null, z.date().nullable().optional()),
  consentText: z.string().min(10, "El texto de consentimiento debe contener al menos 10 caracteres.").nullable().optional(),
}).strict().refine((data) => {
  if (data.benefitStartAt && data.benefitEndAt) {
    return data.benefitStartAt <= data.benefitEndAt;
  }
  return true;
}, {
  message: "La fecha de inicio del beneficio no puede ser posterior a la fecha de término.",
  path: ["benefitStartAt"]
});

// Schema para suscripción pública (Requisito 6)
export const publicSubscriptionSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres.").max(100, "El nombre no puede superar los 100 caracteres."),
  whatsapp: z.string().refine((val) => {
    try {
      normalizeChileanWhatsApp(val);
      return true;
    } catch {
      return false;
    }
  }, {
    message: "Número de WhatsApp chileno inválido."
  }).transform(normalizeChileanWhatsApp),
  honeypot: z.string().max(0, "Acceso no autorizado (Honeypot detectado).").optional().or(z.literal("")),
  touchpointCode: z.string().optional(),
}).strict();
