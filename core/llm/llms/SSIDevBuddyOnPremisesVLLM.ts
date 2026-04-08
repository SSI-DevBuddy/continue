import { SSI_DEVBUDDY_CONFIG } from "../../../SSI_DEVBUDDY_CONFIG.js";
import type {
  LLMOptions,
} from "../../index.js";
import type { LlmApiRequestType } from "../openaiTypeConverters.js";
import OpenAI from "./OpenAI.js";

/**
 * SSIDevBuddyOnPremisesVLLM LLM Provider
 * 
 * This provider connects to the SSI DevBuddy backend which routes to VLLM.
 * - Extends OpenAI to use OpenAI-compatible format
 * - Uses /chat/vscode endpoint through custom backend
 * - Sends OpenAI-compatible payloads to VLLM
 * - Receives OpenAI-compatible SSE responses
 */
class SSIDevBuddyOnPremisesVLLM extends OpenAI {
  static providerName = "ssi-devbuddy-on-premises-vllm";
  static defaultOptions: Partial<LLMOptions> = {
    apiBase: SSI_DEVBUDDY_CONFIG.API_BASE,
    model: "Qwen/Qwen2.5-7B-Instruct",
    maxEmbeddingBatchSize: 64,
  };

  constructor(options: LLMOptions) {
    super(options);
  }

  /**
   * Use OpenAI adapter for all operations
   * This ensures we send OpenAI-compatible payloads
   */
  protected useOpenAIAdapterFor: (LlmApiRequestType | "*")[] = [
    "streamChat",
    "embed",
  ];

  /**
   * Override to use custom backend endpoint
   * All chat requests go to /chat/vscode
   */
  protected _getEndpoint(
    endpoint: "chat/completions" | "completions" | "models"
  ) {
    // Route all requests to /chat/vscode
    return new URL("chat/vscode", SSI_DEVBUDDY_CONFIG.CHAT_URL);
  }

  /**
   * Override to use custom authentication
   * Must match OpenAI's _getHeaders() return type
   */
  protected _getHeaders() {
    const apiKey = this.apiKey ?? "";
    
    if (!apiKey) {
      throw new Error(
        "SSI DevBuddy API key not set. Please log in first to authenticate.",
      );
    }

    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "api-key": apiKey, // Required by OpenAI's type signature
    };
  }

  /**
   * Embedding support via custom backend endpoint
   * Uses /chat/vscode_embed instead of standard /embeddings
   */
  protected async _embed(chunks: string[]): Promise<number[][]> {
    const apiKey = this.apiKey;

    if (!apiKey) {
      throw new Error(
        "SSI DevBuddy API key not set. Please log in first to authenticate.",
      );
    }

    return (
      await Promise.all(
        chunks.map(async (chunk) => {
          try {
            const response = await fetch(
              new URL("chat/vscode_embed", SSI_DEVBUDDY_CONFIG.CHAT_URL),
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                  modelId: this.model,
                  input: [chunk],
                  projectId: this.projectId ?? null
                }),
              }
            );

            if (!response.ok) {
              throw new Error(
                `API request failed with status ${response.status}`
              );
            }

            const responseBody = await response.json();
            return responseBody.embeddings || responseBody.data || [];
          } catch (e) {
            console.error(`Error fetching embeddings for chunk:`, chunk, e);
            return [];
          }
        })
      )
    ).flat();
  }
}

export default SSIDevBuddyOnPremisesVLLM;