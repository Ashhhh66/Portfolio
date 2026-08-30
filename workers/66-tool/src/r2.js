function encodeRfc3986(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => {
    return `%${char.charCodeAt(0).toString(16).toUpperCase()}`;
  });
}

async function sha256Hex(data) {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmac(key, data) {
  const rawKey = typeof key === "string" ? new TextEncoder().encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

export function resolveS3Endpoint(env) {
  const explicit = String(env.R2_S3_ENDPOINT || env.S3_ENDPOINT || "").replace(/\/$/, "");
  if (explicit) return explicit;
  const accountId = env.R2_ACCOUNT_ID || env.ACCOUNT_ID || "";
  if (accountId) return `https://${accountId}.r2.cloudflarestorage.com`;
  return "";
}

export function hasS3Creds(env) {
  return Boolean(
    (env.R2_ACCESS_KEY_ID || env.ACCESS_KEY_ID) &&
      (env.R2_SECRET_ACCESS_KEY || env.SECRET_ACCESS_KEY) &&
      resolveS3Endpoint(env),
  );
}

export async function getObjectViaS3(env, objectKey) {
  const accessKey = env.R2_ACCESS_KEY_ID || env.ACCESS_KEY_ID;
  const secretKey = env.R2_SECRET_ACCESS_KEY || env.SECRET_ACCESS_KEY;
  const bucket = env.R2_BUCKET || "66-tool-releases";
  const endpoint = resolveS3Endpoint(env);
  const region = env.R2_REGION || "auto";
  const host = new URL(endpoint).host;
  const canonicalUri = `/${encodeRfc3986(bucket)}/${objectKey.split("/").map(encodeRfc3986).join("/")}`;
  const amzDate = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = await sha256Hex("");
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const canonicalRequest = [
    "GET",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");
  const dateKey = await hmac(`AWS4${secretKey}`, dateStamp);
  const regionKey = await hmac(dateKey, region);
  const serviceKey = await hmac(regionKey, "s3");
  const signingKey = await hmac(serviceKey, "aws4_request");
  const signatureBuf = await hmac(signingKey, stringToSign);
  const signature = [...new Uint8Array(signatureBuf)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  const response = await fetch(`${endpoint}${canonicalUri}`, {
    method: "GET",
    headers: {
      host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`r2_get_${response.status}`);
  }
  return {
    body: response.body,
    size: Number(response.headers.get("content-length") || "") || null,
  };
}

export async function getReleaseObject(env, objectKey) {
  if (hasS3Creds(env)) {
    return getObjectViaS3(env, objectKey);
  }
  if (env.TOOL_BUCKET) {
    const object = await env.TOOL_BUCKET.get(objectKey);
    if (!object) return null;
    return { body: object.body, size: object.size ?? null };
  }
  return null;
}
