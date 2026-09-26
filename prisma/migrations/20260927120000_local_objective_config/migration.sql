-- Editores por objetivo de SmartNFC Local: configuración estructurada del objetivo de cada Punto Inteligente
-- (texto del botón principal y, para promociones, su contenido). Solo aditiva: JSONB con DEFAULT constante
-- '{}' (sin reescritura en PostgreSQL 11+). Los puntos existentes conservan destino, códigos y comportamiento.
-- Rollback manual: ALTER TABLE "LocalTouchpoint" DROP COLUMN "objectiveConfig";
ALTER TABLE "LocalTouchpoint" ADD COLUMN "objectiveConfig" JSONB NOT NULL DEFAULT '{}';
