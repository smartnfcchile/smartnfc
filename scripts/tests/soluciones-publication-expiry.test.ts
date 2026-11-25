import "./helpers/test-database";
import assert from "node:assert/strict";
import test from "node:test";
import { publicationExpiry } from "../../lib/soluciones/publication-expiry";

test("publication expiry interprets datetime-local as UTC without normalizing invalid dates", () => {
  assert.equal(publicationExpiry(""), undefined);
  assert.equal(publicationExpiry("2027-01-15T04:30")?.toISOString(), "2027-01-15T04:30:00.000Z");
  for (const value of ["2027-02-30T04:30", "2027-01-15T24:00", "2027-01-15T04:30-03:00"]) {
    assert.throws(() => publicationExpiry(value), /UTC/);
  }
});
