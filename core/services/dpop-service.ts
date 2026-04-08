import { generateKeyPair as generateKeyPairCb, webcrypto } from "node:crypto";
import { promisify } from "node:util";

const nodeGenerateKeyPair = promisify(generateKeyPairCb);

// /** jose signs JWKs via `crypto.subtle.importKey`; some hosts (e.g. IDE-embedded Node) omit `subtle`. */
// if (typeof globalThis.crypto === "undefined" || !globalThis.crypto.subtle) {
//   (globalThis as unknown as { crypto: typeof webcrypto }).crypto = webcrypto;
// }

import { fetchwithRequestOptions } from "@continuedev/fetch";
import { SignJWT } from "jose";
import { SSI_DEVBUDDY_CONFIG } from "../../SSI_DEVBUDDY_CONFIG.js";
import type { RequestOptions } from "../index.js";

/**
 * DPoP (Demonstrating Proof-of-Possession) Service for VS Code Extension
 *
 * This service manages cryptographic key pairs and generates DPoP proofs
 * for securing API requests. Keys are stored in IDE secret storage.
 *
 * Based on RFC 9449: OAuth 2.0 Demonstrating Proof of Possession (DPoP)
 *
 * USAGE:
 * 1. Initialize once in Core constructor:
 *    DpopService.initialize({
 *      storeSecret: ide.storeSecret.bind(ide),
 *      getSecret: ide.getSecret.bind(ide),
 *      deleteSecret: ide.deleteSecret.bind(ide)
 *    });
 *
 * 2. Use anywhere in the codebase:
 *    const proof = await DpopService.generateDPoPProof({ method: 'POST', url });
 */

type DPoPKeyPair = {
  privateKeyJwk: JsonWebKey;
  publicKeyJWK: JsonWebKey;
};

type DPoPProofOptions = {
  method: string;
  url: string;
};

let currentKeyPair: DPoPKeyPair | null = null;

let ideStorage: {
  storeSecret: (key: string, value: string) => Promise<void>;
  getSecret: (key: string) => Promise<string | undefined>;
  deleteSecret: (key: string) => Promise<void>;
} | null = null;

const STORAGE_KEYS = {
  PRIVATE_KEY: "ssi_devbuddy_dpop_private_key",
  PUBLIC_KEY_JWK: "ssi_devbuddy_dpop_public_key_jwk",
} as const;

/** Node JWK exports omit `alg`; jose `importKey("jwk", …)` requires it for ES256. */
const DPOP_ES256_ALG = "ES256" as const;

function privateJwkForJose(jwk: JsonWebKey): JsonWebKey {
  return { ...jwk, alg: jwk.alg ?? DPOP_ES256_ALG };
}

/**
 * Public JWK for the DPoP JWT header. Node’s `export({ format: "jwk" })` omits `alg`, but
 * `jose`’s `importJWK` → `jwkToKey` requires `alg` for EC keys (your backend uses `importJWK(jwk)`).
 * RFC 7638 thumbprint for EC only uses crv, kty, x, y — adding `alg` does not change `cnf.jkt`.
 */
function publicJwkForDpopHeader(jwk: JsonWebKey): JsonWebKey {
  return { ...jwk, alg: jwk.alg ?? DPOP_ES256_ALG };
}

export function initialize(storage: {
  storeSecret: (key: string, value: string) => Promise<void>;
  getSecret: (key: string) => Promise<string | undefined>;
  deleteSecret: (key: string) => Promise<void>;
}): void {
  if (ideStorage !== null) {
    console.warn("[DPoP] Service already initialized, reinitializing...");
  }

  ideStorage = storage;
  console.log("[DPoP] Service initialized with IDE storage");
}

function ensureInitialized(): void {
  if (ideStorage === null) {
    throw new Error(
      "DPoP service not initialized. Call DpopService.initialize() in Core constructor first.",
    );
  }
}

export async function generateKeyPair(): Promise<DPoPKeyPair> {
  ensureInitialized();

  try {
    const { privateKey, publicKey } = await nodeGenerateKeyPair("ec", {
      namedCurve: "P-256",
    });

    const publicKeyJWK = publicJwkForDpopHeader(
      publicKey.export({ format: "jwk" }) as JsonWebKey,
    );
    const privateKeyJwk = privateJwkForJose(
      privateKey.export({ format: "jwk" }) as JsonWebKey,
    );

    currentKeyPair = { privateKeyJwk, publicKeyJWK: publicKeyJWK };
    await storeKeyPair(currentKeyPair);

    return currentKeyPair;
  } catch (error: any) {
    throw new Error(`DPoP key generation failed: ${error.message}`);
  }
}

async function storeKeyPair(keyPair: DPoPKeyPair): Promise<void> {
  ensureInitialized();

  try {
    await ideStorage!.storeSecret(
      STORAGE_KEYS.PRIVATE_KEY,
      JSON.stringify(keyPair.privateKeyJwk),
    );

    await ideStorage!.storeSecret(
      STORAGE_KEYS.PUBLIC_KEY_JWK,
      JSON.stringify(keyPair.publicKeyJWK),
    );

    console.log("[DPoP] Key pair stored in IDE secret storage");
  } catch (error: any) {
    console.error("[DPoP] Failed to store key pair:", error);
    throw new Error(`DPoP key storage failed: ${error.message}`);
  }
}

export async function loadKeyPair(): Promise<DPoPKeyPair | null> {
  ensureInitialized();

  try {
    const privateKeyJWKString = await ideStorage!.getSecret(
      STORAGE_KEYS.PRIVATE_KEY,
    );
    const publicKeyJWKString = await ideStorage!.getSecret(
      STORAGE_KEYS.PUBLIC_KEY_JWK,
    );

    if (!privateKeyJWKString || !publicKeyJWKString) {
      console.log("[DPoP] No stored key pair found");
      return null;
    }

    const privateKeyJwk = JSON.parse(privateKeyJWKString) as JsonWebKey;
    const publicKeyJWK = JSON.parse(publicKeyJWKString) as JsonWebKey;

    const keyPair: DPoPKeyPair = {
      privateKeyJwk,
      publicKeyJWK,
    };

    currentKeyPair = keyPair;
    console.log("[DPoP] Key pair loaded from storage");
    return keyPair;
  } catch (error) {
    console.error("[DPoP] Failed to load key pair:", error);
    return null;
  }
}

export async function generateDPoPProof(
  options: DPoPProofOptions,
): Promise<string> {
  ensureInitialized();

  if (!currentKeyPair) {
    console.log(
      "[DPoP] Keys not in memory, attempting to load from storage...",
    );
    await loadKeyPair();
  }

  if (!currentKeyPair) {
    throw new Error("No DPoP key pair available. Please login first.");
  }

  try {
    const iat = Math.floor(Date.now() / 1000);

    const dpopProof = await new SignJWT({
      htm: options.method.toUpperCase(),
      htu: options.url,
      iat,
    })
      .setProtectedHeader({
        typ: "dpop+jwt",
        alg: "ES256",
        jwk: publicJwkForDpopHeader(currentKeyPair.publicKeyJWK),
      })
      .sign(privateJwkForJose(currentKeyPair.privateKeyJwk));

    return dpopProof;
  } catch (error: any) {
    console.error("[DPoP] Failed to generate proof:", error);
    throw new Error(`DPoP proof generation failed: ${error.message}`);
  }
}

export function getPublicKeyJWK(): JsonWebKey | null {
  return currentKeyPair?.publicKeyJWK ?? null;
}

export async function clearKeys(): Promise<void> {
  ensureInitialized();

  try {
    currentKeyPair = null;

    await ideStorage!.deleteSecret(STORAGE_KEYS.PRIVATE_KEY);
    await ideStorage!.deleteSecret(STORAGE_KEYS.PUBLIC_KEY_JWK);

    console.log("[DPoP] Keys cleared from memory and storage");
  } catch (error) {
    console.error("[DPoP] Failed to clear keys:", error);
    throw error;
  }
}

export function normalizeUrl(url: string): string {
  let normalized = url.split("?")[0].split("#")[0];

  normalized = normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;

  console.log(`[DPoP] URL normalized: ${url} -> ${normalized}`);

  return normalized;
}

export async function fetchWithDPoP(
  url: URL | string,
  init: RequestInit | undefined,
  requestOptions?: RequestOptions,
) {
  const urlString = typeof url === "string" ? url : url.toString();

  const isSSIDevBuddyAPI =
    urlString.includes(SSI_DEVBUDDY_CONFIG.API_BASE) ||
    urlString.includes(SSI_DEVBUDDY_CONFIG.CHAT_URL);

  if (isSSIDevBuddyAPI) {
    try {
      const normalizedUrl = normalizeUrl(urlString);
      const method = init?.method || "GET";
      const dpopProof = await generateDPoPProof({
        method,
        url: normalizedUrl,
      });

      const existingHeaders =
        init?.headers instanceof Headers
          ? Object.fromEntries(init.headers.entries())
          : ((init?.headers || {}) as Record<string, string>);

      init = {
        ...init,
        headers: {
          ...existingHeaders,
          DPoP: dpopProof,
        },
      };

      console.log(`[DPoP] Added proof to ${method} ${urlString}`);
    } catch (e) {
      console.warn(
        "[DPoP] Failed to add DPoP header, proceeding without it:",
        e,
      );
    }
  }

  return fetchwithRequestOptions(
    typeof url === "string" ? new URL(url) : url,
    init as any,
    requestOptions,
  );
}
