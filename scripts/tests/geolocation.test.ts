import "./helpers/test-database";
import test from "node:test";
import assert from "node:assert/strict";
import { installationDto, parseInstallation, pointKind, validCoordinates } from "../../lib/geolocation/validation";
test("WGS84 accepts extremes, zeros and southern/western coordinates", () => {
  for (const [lat,lng] of [[-90,-180],[90,180],[0,0],[-39.82,-73.24]]) assert.equal(validCoordinates(lat,lng),true);
});
test("rejects malformed, non-finite, out-of-range and missing coordinates", () => {
  for (const [lat,lng] of [[91,0],[0,181],[-91,0],[0,-181],[NaN,0],[0,Infinity],["0",0],[null,0],[true,0],[undefined,0]]) assert.throws(() => parseInstallation({latitude:lat,longitude:lng}));
  for (const v of [null,[],false,{}, {latitude:0}]) assert.throws(() => parseInstallation(v));
});
test("optional fields, privacy defaults and strict request allowlist", () => {
  const v = parseInstallation({latitude:0,longitude:0,label:"  Entrance  ",address:" ",accuracyMeters:0});
  assert.equal(v.label,"Entrance"); assert.equal(v.address,null); assert.equal(v.visibility,"PRIVATE"); assert.equal(v.method,"MANUAL");
  for (const extra of [{visibility:"PUBLIC"},{companyId:"other"},{updatedById:"other"},{method:"GPS"},{accuracyMeters:NaN},{accuracyMeters:-1},{accuracyMeters:Infinity},{label:"x".repeat(121)},{address:9}]) assert.throws(() => parseInstallation({latitude:0,longitude:0,...extra}));
});
test("DTO includes no internal IDs, serializes date and represents pending explicitly", () => {
  assert.deepEqual(installationDto(null),{status:"PENDING"});
  const input = parseInstallation({latitude:0,longitude:0});
  const dto = installationDto({...input,updatedAt:new Date("2026-10-25T12:00:00Z")});
  assert.equal(dto.status,"CONFIGURED"); assert.match(JSON.stringify(dto),/2026-10-25T12:00:00.000Z/);
  assert.doesNotMatch(JSON.stringify(dto),/companyId|updatedById|physicalNfcCardId/);
  assert.equal(pointKind("physical"),"physical"); assert.throws(() => pointKind("card"));
});
