import type { JSONSchema7, JSONSchema7Object } from "json-schema";

import { streamSse } from "@continuedev/fetch";
import { SSI_DEVBUDDY_CONFIG } from "../../../SSI_DEVBUDDY_CONFIG.js";
import type {
  ChatMessage,
  ChatMessageRole,
  CompletionOptions,
  LLMOptions,
} from "../../index.js";
import { renderChatMessage, stripImages } from "../../util/messageContent.js";
import { BaseLLM } from "../index.js";
import { fromChatCompletionChunk } from "../openaiTypeConverters.js";
import { PROVIDER_TOOL_SUPPORT } from "../toolSupport.js";
import { withLLMRetry } from "../utils/retry.js";

type OllamaChatMessage = {
  role: ChatMessageRole;
  content: string;
  images?: string[] | null;
  tool_calls?: {
    function: {
      name: string;
      arguments: JSONSchema7Object;
    };
  }[];
};

interface OllamaTool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: JSONSchema7;
  };
}

/**
 * SSIDevBuddyOnPremisesVLLM LLM Provider
 * 
 * This provider connects to the SSI DevBuddy backend which routes to VLLM.
 * - Uses the same /chat/vscode endpoint as other SSI DevBuddy providers
 * - Sends Ollama-compatible input format (backend compatibility)
 * - Receives OpenAI-compatible SSE responses from VLLM
 * - Parses OpenAI format: choices[0].delta.content
 */
class SSIDevBuddyOnPremisesVLLM extends BaseLLM {
  static providerName = "ssi-devbuddy-on-premises-vllm";
  static defaultOptions: Partial<LLMOptions> = {
    apiBase: SSI_DEVBUDDY_CONFIG.API_BASE,
    model: "Qwen/Qwen2.5-7B-Instruct",
    maxEmbeddingBatchSize: 64,
  };

  constructor(options: LLMOptions) {
    super(options);
  }

  protected async *_streamComplete(
    prompt: string,
    signal: AbortSignal,
    options: CompletionOptions,
  ): AsyncGenerator<string> {
    const messages = [{ role: "user" as const, content: prompt }];
    for await (const update of this._streamChat(messages, signal, options)) {
      yield renderChatMessage(update);
    }
  }

  @withLLMRetry()
  protected async *_streamChat(
    messages: ChatMessage[],
    signal: AbortSignal,
    options: CompletionOptions,
  ): AsyncGenerator<ChatMessage> {
    const apiKey = this.apiKey;

    if (!apiKey) {
      throw new Error(
        "SSI DevBuddy API key not set. Please log in first to authenticate.",
      );
    }

    // Generate input payload in Ollama format (backend compatibility)
    const input = this._generateConverseInput(messages, {
      ...options,
      stream: true,
    });
    input.modelId = this.model || "Qwen/Qwen2.5-7B-Instruct";

    const response = await fetch(
      new URL("chat/vscode", SSI_DEVBUDDY_CONFIG.CHAT_URL),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(input),
        signal: signal,
      }
    );

    if (response.status === 499) {
      return; // Aborted by user
    }

    if (!response.ok || !response.body) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    // Parse OpenAI-compatible SSE responses from VLLM
    // Format: data: {"choices":[{"delta":{"content":"..."}}]}
    for await (const value of streamSse(response)) {
      const chunk = fromChatCompletionChunk(value);
      if (chunk) {
        yield chunk;
      }
    }
  }

  /**
   * Generates the input payload for the VS Code API
   * Uses Ollama-compatible format that the backend expects
   * 
   * Copied from SSIDevBuddyOnPremises.ts for backend compatibility
   */
  private _generateConverseInput(
    messages: ChatMessage[],
    options: CompletionOptions,
  ): any {
    const systemMessage = stripImages(
      messages.find((m) => m.role === "system")?.content ?? "",
    );

    const convertedMessages = messages
      .filter((m) => m.role !== "system")
      .map((msg) => this._convertToBackendMessage(msg));

    const supportsTools =
      (this.capabilities?.tools ||
        PROVIDER_TOOL_SUPPORT.ollama?.(options.model)) ??
      false;

    let tools: OllamaTool[] | undefined = undefined;
    if (supportsTools && options.tools && options.tools.length > 0) {
      tools = options.tools.map((tool) => ({
        type: "function",
        function: {
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters,
        },
      }));
    }

    return {
      modelId: options.model,
      messages: convertedMessages,
      tools: tools,
      system: systemMessage || undefined,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      topP: options.topP,
      topK: options.topK,
      stop: options.stop,
      stream: true,
    };
  }

  /**
   * Converts a Continue ChatMessage to backend message format
   * 
   * Copied from SSIDevBuddyOnPremises.ts for backend compatibility
   */
  private _convertToBackendMessage(message: ChatMessage): OllamaChatMessage {
    const result: OllamaChatMessage = {
      role: message.role,
      content: renderChatMessage(message),
    };

    // Extract images if present
    if (Array.isArray(message.content)) {
      const images: string[] = [];
      message.content.forEach((part) => {
        if (part.type === "imageUrl" && part.imageUrl) {
          const image = part.imageUrl?.url.split(",").at(-1);
          if (image) {
            images.push(image);
          }
        }
      });
      if (images.length > 0) {
        result.images = images;
      }
    }

    return result;
  }

  /**
   * Embedding support via backend endpoint
   * 
   * Copied from SSIDevBuddyOnPremises.ts for backend compatibility
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