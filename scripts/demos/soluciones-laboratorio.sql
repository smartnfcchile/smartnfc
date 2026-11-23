DO $demo$
BEGIN
  IF current_database() <> 'smartnfc_laboratorio' OR
    NOT EXISTS (SELECT 1 FROM "Company" WHERE id = 'preview-fixture-a') THEN
    RAISE EXCEPTION 'Laboratorio no identificado';
  END IF;

  INSERT INTO "SolutionProject" (id, "companyId", name, mode, status, "destinationUrl", "updatedAt") VALUES
    ('demo-extintores', 'preview-fixture-a', 'Demo Extintores', 'ASSETS', 'ACTIVE', NULL, now()),
    ('demo-mascotas', 'preview-fixture-a', 'Demo Mascotas', 'ASSETS', 'ACTIVE', NULL, now()),
    ('demo-campana', 'preview-fixture-a', 'Demo Sarcárnico · datos ficticios', 'CAMPAIGN', 'ACTIVE', 'https://example.com/?campaign=demo', now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO "SolutionTemplate" (id, "companyId", "projectId", code, name, fields) VALUES
    ('demo-ext-template', 'preview-fixture-a', 'demo-extintores', 'extintores', 'Extintores',
      '[{"key":"ubicacion","label":"Ubicación","kind":"text","public":true},{"key":"interno","label":"Nota de prueba","kind":"text","public":false}]'),
    ('demo-pet-template', 'preview-fixture-a', 'demo-mascotas', 'mascotas', 'Mascotas',
      '[{"key":"nombre","label":"Nombre","kind":"text","public":true},{"key":"interno","label":"Identificador interno","kind":"text","public":false}]')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO "SolutionRecord" (id, "companyId", "projectId", "templateId", "externalCode", status, data, location, "updatedAt")
  SELECT 'demo-ext-' || n, 'preview-fixture-a', 'demo-extintores', 'demo-ext-template', 'EXT-' || n, 'ACTIVE',
    jsonb_build_object('ubicacion', 'Sector ficticio ' || n, 'interno', 'Privado de prueba'), 'Sede de prueba', now()
  FROM generate_series(1,3) AS n
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO "SolutionRecord" (id, "companyId", "projectId", "templateId", "externalCode", status, data, "updatedAt") VALUES
    ('demo-pet-1', 'preview-fixture-a', 'demo-mascotas', 'demo-pet-template', 'MASC-1', 'ACTIVE',
      '{"nombre":"Luna (ficticia)","interno":"Privado de prueba"}', now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO "SolutionBatch" (id, "companyId", "projectId", name, quantity) VALUES
    ('demo-lote-200', 'preview-fixture-a', 'demo-campana', 'Llaveros de demostración', 200)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO "SolutionTag" (id, "companyId", "projectId", "recordId", "publicToken", status, "updatedAt")
  SELECT 'tag-' || id, "companyId", "projectId", id, replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
    'ACTIVE', now()
  FROM "SolutionRecord"
  WHERE id IN ('demo-ext-1', 'demo-ext-2', 'demo-ext-3', 'demo-pet-1')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO "SolutionTag" (id, "companyId", "projectId", "batchId", "publicToken", status, "updatedAt")
  SELECT 'demo-keychain-' || n, 'preview-fixture-a', 'demo-campana', 'demo-lote-200',
    replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 'ACTIVE', now()
  FROM generate_series(1,200) AS n
  ON CONFLICT (id) DO NOTHING;
END
$demo$;
