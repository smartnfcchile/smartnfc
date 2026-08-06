import assert from "node:assert/strict";
import { PHYSICAL_CARD_TEMPLATES, makeTemplateSide } from "../../lib/physical-card/templates";
import { contrastRatio, validatePrint } from "../../lib/physical-card/validation";

assert.equal(PHYSICAL_CARD_TEMPLATES.length, 12, "Debe haber 12 plantillas iniciales");
assert.equal(new Set(PHYSICAL_CARD_TEMPLATES.map(template => template.layout)).size, 12, "Las composiciones deben ser diferentes");
assert.equal(PHYSICAL_CARD_TEMPLATES.filter(template => template.category === "PROFESSIONAL").length, 6);
assert.equal(PHYSICAL_CARD_TEMPLATES.filter(template => template.category === "LOCAL").length, 6);
const template = PHYSICAL_CARD_TEMPLATES[0]; const front = makeTemplateSide(template); const back = makeTemplateSide(template, true);
assert.ok(validatePrint(front, back).some(finding => finding.level === "RECOMMENDATION"));
assert.ok(contrastRatio("#FFFFFF", "#0F172A") > 4.5);
assert.ok(validatePrint({ ...front, qrVisible: true, qrSizeMm: 17 }, { ...back, qrVisible: false }).some(finding => finding.level === "ERROR"));
assert.ok(validatePrint({ ...front, qrVisible: false }, { ...back, qrVisible: false }).some(finding => finding.message.includes("QR")));
console.log("Physical card tests passed");
