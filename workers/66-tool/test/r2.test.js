import assert from "node:assert/strict";
import { test } from "node:test";
import { hasS3Creds, resolveS3Endpoint } from "../src/r2.js";

test("builds the R2 S3 endpoint from account id", () => {
  assert.equal(
    resolveS3Endpoint({ R2_ACCOUNT_ID: "abc123" }),
    "https://abc123.r2.cloudflarestorage.com",
  );
});

test("prefers an explicit S3 endpoint", () => {
  assert.equal(
    resolveS3Endpoint({
      R2_ACCOUNT_ID: "abc123",
      R2_S3_ENDPOINT: "https://abc123.r2.cloudflarestorage.com/",
    }),
    "https://abc123.r2.cloudflarestorage.com",
  );
});

test("requires key, secret, and endpoint", () => {
  assert.equal(hasS3Creds({}), false);
  assert.equal(
    hasS3Creds({
      R2_ACCESS_KEY_ID: "id",
      R2_SECRET_ACCESS_KEY: "secret",
      R2_ACCOUNT_ID: "abc123",
    }),
    true,
  );
});
