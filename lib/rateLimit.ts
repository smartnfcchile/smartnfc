import { prisma } from "./prisma";
import { hashIp } from "./security";

export type RateLimitAction = "LOCAL_VIEW" | "LOCAL_SUBSCRIBE" | "LOCAL_WHATSAPP_REDIRECT";

interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
}

const ACTION_CONFIGS: Record<RateLimitAction, RateLimitConfig> = {
  LOCAL_VIEW: { limit: 30, windowSeconds: 60 },            // 30 por minuto
  LOCAL_SUBSCRIBE: { limit: 5, windowSeconds: 600 },        // 5 por 10 minutos (600s)
  LOCAL_WHATSAPP_REDIRECT: { limit: 10, windowSeconds: 600 } // 10 por 10 minutos (600s)
};

/**
 * Verifica y registra de forma persistente el rate limiting en la base de datos (Neon).
 * Retorna si el request es permitido y el número de intentos restantes (Requisito Parte C).
 */
export async function checkRateLimit(
  ip: string,
  action: RateLimitAction,
  keyPart?: string
): Promise<{ allowed: boolean; remaining: number }> {
  const config = ACTION_CONFIGS[action];
  if (!config) {
    return { allowed: true, remaining: 999 };
  }

  // Clave enmascarada del rate limit (Requisito C-5)
  const rawKey = `${ip.trim()}:${action}:${keyPart || ""}`;
  const keyHash = hashIp(rawKey);

  const now = new Date();
  const timeMs = now.getTime();
  const windowMs = config.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(timeMs / windowMs) * windowMs);

  try {
    // Upsert atómico seguro frente a concurrencia (Requisito C-6)
    const limit = await prisma.publicRateLimit.upsert({
      where: {
        keyHash_action_windowStart: {
          keyHash,
          action,
          windowStart
        }
      },
      update: {
        count: { increment: 1 }
      },
      create: {
        keyHash,
        action,
        windowStart,
        count: 1
      }
    });

    const allowed = limit.count <= config.limit;
    const remaining = Math.max(0, config.limit - limit.count);

    // Limpieza probabilística rápida para registros > 24 horas (Requisito C-8)
    if (Math.random() < 0.02) {
      const cutOff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      prisma.publicRateLimit.deleteMany({
        where: {
          windowStart: { lt: cutOff }
        }
      }).catch(err => console.error("Error al limpiar rate limits antiguos:", err));
    }

    return { allowed, remaining };
  } catch (err) {
    console.error("Error en persistencia de Rate Limiting:", err);
    // Fail-open para asegurar disponibilidad
    return { allowed: true, remaining: 1 };
  }
}
