import { SignJWT, exportJWK, importJWK } from "jose";

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

// In-memory cache of current key pair
let currentKeyPair: DPoPKeyPair | null = null;

// IDE storage interface (initialized once in Core constructor)
let ideStorage: {
  storeSecret: (key: string, value: string) => Promise<void>;
  getSecret: (key: string) => Promise<string | undefined>;
  deleteSecret: (key: string) => Promise<void>;
} | null = null;

// Storage keys for IDE secret storage
const STORAGE_KEYS = {
  PRIVATE_KEY: "ssi_devbuddy_dpop_private_key",
  PUBLIC_KEY_JWK: "ssi_devbuddy_dpop_public_key_jwk",
} as const;

/**
 * Initialize the DPoP service with IDE storage interface
 * Must be called once during Core initialization before any other DPoP functions
 *
 * @param storage Object containing IDE storage methods
 * @throws Error if already initialized
 */
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

/**
 * Check if the DPoP service has been initialized
 * @throws Error if not initialized
 */
function ensureInitialized(): void {
  if (ideStorage === null) {
    throw new Error(
      "DPoP service not initialized. Call DpopService.initialize() in Core constructor first.",
    );
  }
}

/**
 * Generate a new ECDSA P-256 key pair for DPoP proofs
 * Automatically stores the key pair in IDE secret storage
 *
 * @returns Promise resolving to the generated key pair
 * @throws Error if not initialized or if key generation/storage fails
 */
export async function generateKeyPair(): Promise<DPoPKeyPair> {
  ensureInitialized();

  try {
    // Check if we're in a browser-like environment with crypto.subtle
    if (!globalThis.crypto?.subtle) {
      throw new Error(
        "Web Crypto API not available. DPoP requires crypto.subtle support.",
      );
    }

    // Generate ECDSA P-256 key pair
    const keyPair = await globalThis.crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      true, // extractable (needed for storage)
      ["sign", "verify"],
    );

    // Export public key as JWK for transmission to server
    const publicKeyJWK = await exportJWK(keyPair.publicKey);

    const dpopKeyPair: DPoPKeyPair = {
      privateKey: keyPair.privateKey,
      publicKeyJWK,
    };

    // Cache in memory
    currentKeyPair = dpopKeyPair;

    // Store in IDE secret storage
    await storeKeyPair(dpopKeyPair);

    console.log("[DPoP] Key pair generated and stored successfully");
    return dpopKeyPair;
  } catch (error: any) {
    console.error("[DPoP] Failed to generate key pair:", error);
    throw new Error(`DPoP key generation failed: ${error.message}`);
  }
}

/**
 * Store DPoP key pair in IDE secret storage (internal helper)
 *
 * @param keyPair The key pair to store
 * @throws Error if not initialized or if storage fails
 */
async function storeKeyPair(keyPair: DPoPKeyPair): Promise<void> {
  ensureInitialized();

  try {
    // Export private key as JWK for storage
    const privateKeyJWK = await exportJWK(keyPair.privateKey);

    // Store both keys as JSON strings
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

/**
 * Load DPoP key pair from IDE secret storage
 *
 * @returns Promise resolving to the loaded key pair, or null if not found
 * @throws Error if not initialized
 */
export async function loadKeyPair(): Promise<DPoPKeyPair | null> {
  ensureInitialized();

  try {
    // Retrieve stored keys
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

    // Parse JSON strings
    const privateKeyJWK = JSON.parse(privateKeyJWKString);
    const publicKeyJWK = JSON.parse(publicKeyJWKString);

    // Import private key from JWK
    const privateKey = await importJWK(privateKeyJWK, "ES256");

    const keyPair: DPoPKeyPair = {
      privateKey: privateKey as CryptoKey,
      publicKeyJWK,
    };

    // Cache in memory
    currentKeyPair = keyPair;
    console.log("[DPoP] Key pair loaded from storage");
    return keyPair;
  } catch (error) {
    console.error("[DPoP] Failed to load key pair:", error);
    return null;
  }
}

/**
 * Generate a DPoP proof JWT for an HTTP request
 * Automatically loads keys from storage if not in memory
 *
 * @param options Request details (method and URL)
 * @returns Promise resolving to the DPoP proof JWT string
 * @throws Error if not initialized, no key pair available, or proof generation fails
 */
export async function generateDPoPProof(
  options: DPoPProofOptions,
): Promise<string> {
  ensureInitialized();

  // Auto-load keys if not in memory
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
    // Current timestamp in seconds
    const iat = Math.floor(Date.now() / 1000);

    // Create DPoP proof JWT
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

/**
 * Get the public key JWK from the current key pair
 *
 * @returns The public key JWK or null if no key pair exists
 */
export function getPublicKeyJWK(): any | null {
  return currentKeyPair?.publicKeyJWK || null;
}

/**
 * Check if DPoP keys are currently loaded in memory
 *
 * @returns True if keys are available, false otherwise
 */
export function hasKeys(): boolean {
  return currentKeyPair !== null;
}

/**
 * Clear DPoP keys from both memory and IDE storage
 *
 * @throws Error if not initialized
 */
export async function clearKeys(): Promise<void> {
  ensureInitialized();

  try {
    // Clear from memory
    currentKeyPair = null;

    // Clear from storage
    await ideStorage!.deleteSecret(STORAGE_KEYS.PRIVATE_KEY);
    await ideStorage!.deleteSecret(STORAGE_KEYS.PUBLIC_KEY_JWK);

    console.log("[DPoP] Keys cleared from memory and storage");
  } catch (error) {
    console.error("[DPoP] Failed to clear keys:", error);
    throw error;
  }
}

/**
 * Normalize URL for DPoP proof generation
 * Removes query parameters and trailing slashes as per backend expectations
 * Also converts localhost to 127.0.0.1 to match Node.js fetch behavior
 *
 * @param url The URL to normalize
 * @returns Normalized URL string
 */
export function normalizeUrl(url: string): string {
  // Remove query parameters and fragments
  let normalized = url.split("?")[0].split("#")[0];

  // Remove trailing slash
  normalized = normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;

  console.log(`[DPoP] URL normalized: ${url} -> ${normalized}`);

  return normalized;
}

/**
 * Get storage keys (for testing or external use)
 */
export function getStorageKeys() {
  return STORAGE_KEYS;
}
