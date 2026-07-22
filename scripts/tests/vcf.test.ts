import { sanitizeVcfText, cleanVcfPhone, generateSingleVcfString, generateMultiVcfString } from "../../lib/vcf";

function assertEqual(actual: string, expected: string, msg: string) {
  if (actual !== expected) {
    throw new Error(`[Assertion Failed] ${msg}\n  Expected: ${JSON.stringify(expected)}\n  Actual  : ${JSON.stringify(actual)}`);
  }
}

function runVcfTests() {
  console.log("=========================================================================");
  console.log("PRUEBAS DE HELPER DE VCF (SANITIZACIÓN Y PROTOCOLO)");
  console.log("=========================================================================");

  // Test 1: Sanitización de textos normales y caracteres especiales
  assertEqual(sanitizeVcfText("Normal Text"), "Normal Text", "Texto normal");
  assertEqual(sanitizeVcfText("Texto con, comas; y backslash\\"), "Texto con\\, comas\\; y backslash\\\\", "Escape de comas, punto y coma y backslash");

  // Test 2: Inyección CRLF y saltos de línea
  assertEqual(sanitizeVcfText("Texto con\nline\rbreak"), "Texto con line break", "Neutralización de saltos de línea y CRLF");

  // Test 3: Normalización de teléfonos
  assertEqual(cleanVcfPhone("+56 9 1234 5678"), "+56912345678", "Normalizar teléfono con espacios");
  assertEqual(cleanVcfPhone("56912345678"), "56912345678", "Normalizar teléfono sin prefijo");
  assertEqual(cleanVcfPhone("abc-123+45"), "+12345", "Filtrado de caracteres no numéricos excepto el signo +");

  // Test 4: Estructura de vCard
  const vcard = generateSingleVcfString({
    fullName: "Juan Perez\nInyectado",
    orgName: "Club Local; Test",
    phone: "+56 9 9876 5432",
    address: "Av. Diagonal, 123",
    url: "https://smartnfc.cl/club/test"
  });

  // Verificar que termina con CRLF y contiene las líneas sanitizadas
  const lines = vcard.split("\r\n");
  assertEqual(lines[0], "BEGIN:VCARD", "BEGIN:VCARD");
  assertEqual(lines[1], "VERSION:3.0", "VERSION:3.0");
  assertEqual(lines[2], "FN:Juan Perez Inyectado", "FN con salto removido");
  assertEqual(lines[3], "ORG:Club Local\\; Test", "ORG con punto y coma escapado");
  assertEqual(lines[4], "TEL;TYPE=CELL,VOICE:+56998765432", "TEL normalizado");
  assertEqual(lines[5], "ADR;TYPE=WORK:;;Av. Diagonal\\, 123;;;;", "ADR con coma escapada");
  assertEqual(lines[6], "URL:https://smartnfc.cl/club/test", "URL");
  assertEqual(lines[7], "END:VCARD", "END:VCARD");
  assertEqual(lines[8], "", "Línea vacía al final");

  console.log(">>> TODAS LAS PRUEBAS DE VCF PASARON EXITOSAMENTE! <<<");
}

runVcfTests();
