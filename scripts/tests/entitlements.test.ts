import assert from "node:assert/strict";
import { test } from "node:test";
import type { CompanyProductLicense, CompanyCapabilityOverride, CompanyLimitOverride } from "@prisma/client";
import { resolveEntitlements, type EntitlementInput } from "../../lib/entitlements/resolve";
const now = new Date("2026-09-17T12:00:00Z");
function license(planCode: CompanyProductLicense["planCode"], status: CompanyProductLicense["status"] = "ACTIVE"): CompanyProductLicense {
  return { id: "l", companyId: "a", product: planCode.startsWith("LOCAL") ? "LOCAL" : "EMPRESAS", planCode, status, includedIdentities: 12, authorizedExtraIdentities: 0, includedBranches: 12, includedCampaigns: 4, includedTouchpoints: 20, maxActiveTouchpointsPerLocation: null, startsAt: null, expiresAt: null, renewsAt: null, notes: null, createdAt: now, updatedAt: now };
}
const input = (licenses: CompanyProductLicense[] = []): EntitlementInput => ({ companyId: "a", isActive: true, maxIdentities: 5, profileRights: 1, licenses, capabilityOverrides: [], limitOverrides: [] });
test("A: permanent base retains profile/edit/contact but no premium", () => {
  const e=resolveEntitlements(input(),now);assert.ok(e.capabilities.includes("PROFILE_EDIT"));assert.ok(e.capabilities.includes("CONTACT_SHARING"));assert.ok(!e.capabilities.includes("CRM"));assert.ok(!e.capabilities.includes("ANALYTICS"));
});
test("B: Pro active grants premium; all inactive states preserve base only",()=>{
  for(const status of ["ACTIVE","PENDING","SUSPENDED","CANCELLED","EXPIRED"] as const){const e=resolveEntitlements(input([license("EMPRESAS_PRO",status)]),now);assert.equal(e.capabilities.includes("CRM"),status==="ACTIVE");assert.equal(e.capabilities.includes("LEAD_CAPTURE"),status==="ACTIVE");assert.equal(e.capabilities.includes("ANALYTICS"),status==="ACTIVE");assert.ok(e.capabilities.includes("PROFILE"));}
  for(const dates of [{expiresAt:now},{startsAt:new Date(+now+1)}])assert.ok(!resolveEntitlements(input([{...license("EMPRESAS_PRO"),...dates}]),now).capabilities.includes("CRM"));
});
test("C: teams share capabilities and enforce 5/10/25; contracts configurable",()=>{
  for(const n of [5,10,25]){const e=resolveEntitlements(input([license(`EMPRESAS_TEAM_${n}` as CompanyProductLicense["planCode"])]),now);assert.equal(e.limits.MAX_IDENTITIES,n);for(const cap of ["CRM","TEAM_MANAGEMENT","PROFILE_EDIT_POLICY","COMPANY_AGGREGATED_ANALYTICS"] as const)assert.ok(e.capabilities.includes(cap));}
  assert.equal(resolveEntitlements(input([license("EMPRESAS_TEAM_CONTRACT")]),now).limits.MAX_IDENTITIES,12);
});
test("D/E: Local 1/3/5 locations and ten active points, inactive license blocks Local",()=>{
  for(const [code,n] of [["LOCAL_PRO",1],["LOCAL_PACK_3",3],["LOCAL_PACK_5",5]] as const){const e=resolveEntitlements(input([license(code)]),now);assert.equal(e.limits.MAX_LOCATIONS,n);assert.equal(e.limits.MAX_TOUCHPOINTS_PER_LOCATION,10);assert.ok(e.localOperational);}
  for(const status of ["PENDING","SUSPENDED","CANCELLED","EXPIRED"] as const)assert.equal(resolveEntitlements(input([license("LOCAL_PRO",status)]),now).localOperational,false);
});
test("F: foreign licenses and overrides never affect tenant",()=>{
  const i=input([{...license("EMPRESAS_PRO"),companyId:"b"}]);assert.ok(!resolveEntitlements(i,now).capabilities.includes("CRM"));
});
test("G: explicit legacy compatibility preserves capacity semantics without renaming",()=>{
  for(const [code,n] of [["EMPRESAS_CONECTA",5],["EMPRESAS_CRECE",15],["EMPRESAS_ESCALA",30],["EMPRESAS_HISTORICO",12]] as const){const e=resolveEntitlements(input([license(code)]),now);assert.equal(e.limits.MAX_IDENTITIES,n);assert.ok(e.legacyProducts.includes("EMPRESAS"));assert.ok(e.capabilities.includes("CRM"));}
  const e=resolveEntitlements(input([license("LOCAL_FUNDADOR")]),now);assert.equal(e.limits.LEGACY_MAX_TOUCHPOINTS,3);assert.equal(e.limits.MAX_TOUCHPOINTS_PER_LOCATION,null);
  assert.equal(resolveEntitlements(input([license("LOCAL_PERSONALIZADO")]),now).limits.LEGACY_MAX_TOUCHPOINTS,20);
});
test("Overrides: dates, revocation, restrictions, tenant, security and inactive Local",()=>{
  const o: CompanyCapabilityOverride={id:"o",companyId:"a",capability:"ANALYTICS",enabled:true,startsAt:now,expiresAt:null,reason:"Trial",authorUserId:"admin",revokedAt:null,revokedByUserId:null,createdAt:now};
  const i=input();i.capabilityOverrides=[o];assert.ok(resolveEntitlements(i,now).capabilities.includes("ANALYTICS"));
  for(const patch of [{companyId:"b"},{revokedAt:now},{expiresAt:now},{startsAt:new Date(+now+1)}])assert.ok(!resolveEntitlements({...i,capabilityOverrides:[{...o,...patch}]},now).capabilities.includes("ANALYTICS"));
  assert.equal(resolveEntitlements({...i,isActive:false},now).capabilities.length,0);
  assert.ok(!resolveEntitlements({...i,licenses:[license("EMPRESAS_PRO","SUSPENDED")]},now).capabilities.includes("ANALYTICS"));
  assert.equal(resolveEntitlements({...i,licenses:[license("LOCAL_PRO","SUSPENDED")],capabilityOverrides:[{...o,capability:"LOCAL_ACCESS"}]},now).localOperational,false);
  const limit:CompanyLimitOverride={...o,limit:"MAX_IDENTITIES",value:12};
  assert.equal(resolveEntitlements({...input([license("EMPRESAS_TEAM_10")]),limitOverrides:[limit]},now).limits.MAX_IDENTITIES,12);
  assert.ok(!resolveEntitlements({...input([license("EMPRESAS_PRO")]),capabilityOverrides:[{...o,enabled:false}]},now).capabilities.includes("ANALYTICS"));
});

 test("License presets are normalized and contractual limits validated",()=>{
 const {normalizeLicenseInput}=require("../../lib/entitlements/license-input");
 assert.equal(normalizeLicenseInput("EMPRESAS",{planCode:"EMPRESAS_TEAM_5",status:"ACTIVE",includedIdentities:999}).includedIdentities,5);
 assert.equal(normalizeLicenseInput("LOCAL",{planCode:"LOCAL_PACK_3",status:"ACTIVE",includedBranches:99}).includedBranches,3);
 assert.throws(()=>normalizeLicenseInput("LOCAL",{planCode:"LOCAL_CONTRACT",status:"ACTIVE",includedBranches:0}));
 });
