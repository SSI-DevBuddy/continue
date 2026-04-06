import { fetchwithRequestOptions } from "@continuedev/fetch";
import {
  SignJWT,
  exportJWK,
  importJWK,
  generateKeyPair as joseGenerateKeyPair,
} from "jose";
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
  privateKey: CryptoKey;
  publicKeyJWK: any;
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
    const { privateKey, publicKey } = await joseGenerateKeyPair("ES256");

    const publicKeyJWK = await exportJWK(publicKey);

    const dpopKeyPair: DPoPKeyPair = {
      privateKey: privateKey as CryptoKey,
      publicKeyJWK,
    };

    currentKeyPair = dpopKeyPair;
    await storeKeyPair(dpopKeyPair);

    console.log("[DPoP] Key pair generated and stored successfully");
    return dpopKeyPair;
  } catch (error: any) {
    console.error("[DPoP] Failed to generate key pair:", error);
    throw new Error(`DPoP key generation failed: ${error.message}`);
  }
}

async function storeKeyPair(keyPair: DPoPKeyPair): Promise<void> {
  ensureInitialized();

  try {
    // Export private key as JWK for storage
    const privateKeyJWK = await exportJWK(keyPair.privateKey);

    await ideStorage!.storeSecret(
      STORAGE_KEYS.PRIVATE_KEY,
      JSON.stringify(privateKeyJWK),
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

    const privateKeyJWK = JSON.parse(privateKeyJWKString);
    const publicKeyJWK = JSON.parse(publicKeyJWKString);

    const privateKey = await importJWK(privateKeyJWK, "ES256");

    const keyPair: DPoPKeyPair = {
      privateKey: privateKey as CryptoKey,
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
        jwk: currentKeyPair.publicKeyJWK,
      })
      .sign(currentKeyPair.privateKey);

    return dpopProof;
  } catch (error: any) {
    console.error("[DPoP] Failed to generate proof:", error);
    throw new Error(`DPoP proof generation failed: ${error.message}`);
  }
}

export function getPublicKeyJWK(): any | null {
  return currentKeyPair?.publicKeyJWK || null;
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
