import type { JSONSchema7, JSONSchema7Object } from "json-schema";
import { v4 as uuidv4 } from "uuid";

import { SSI_DEVBUDDY_CONFIG } from "../../../SSI_DEVBUDDY_CONFIG.js";
import type {
  ChatMessage,
  ChatMessageRole,
  CompletionOptions,
  LLMOptions,
  ThinkingChatMessage,
} from "../../index.js";
import { renderChatMessage, stripImages } from "../../util/messageContent.js";
import { BaseLLM } from "../index.js";
import { PROVIDER_TOOL_SUPPORT } from "../toolSupport.js";
import { withLLMRetry } from "../utils/retry.js";

type OllamaChatMessage = {
  role: ChatMessageRole;
  content: string;
  images?: string[] | null;
  thinking?: string;
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

type OllamaChatResponse = {
  error?: string;
  message?: OllamaChatMessage;
  model?: string;
  created_at?: string;
  done?: boolean;
};

/**
 * SSIDevBuddyOnPremises LLM Provider
 *
 * This provider is identical to SSIDevBuddy in terms of API usage.
 * Both call the same /chat/vscode endpoint. The backend routes to
 * different models
 */
class SSIDevBuddyOnPremises extends BaseLLM {
  static providerName = "ssi-devbuddy-on-premises";
  static defaultOptions: Partial<LLMOptions> = {
    apiBase: SSI_DEVBUDDY_CONFIG.API_BASE,
    model: "qwen2.5:14b-instruct",
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

    if ((options as any).projectId) {
      this.projectId = (options as any).projectId;
    }
    if ((options as any).llmKey) {
      this.llmKey = (options as any).llmKey;
    }

    const input = this._generateConverseInput(messages, {
      ...options,
      stream: true,
    });
    input.modelId = this.model || "qwen2.5:14b-instruct";
    if (this.projectId) {
      input.projectId = this.projectId;
    }
    if (this.llmKey) {
      input.llmKey = this.llmKey;
    }

    const response = await fetch(
      new URL("chat/vscode", SSI_DEVBUDDY_CONFIG.CHAT_URL),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(input),
        signal: signal,
      },
    );

    if (response.status === 499) {
      return; // Aborted by user
    }

    if (!response.ok || !response.body) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    // Helper function to stream JSON responses
    async function* streamToJSON(readableStream: ReadableStream<Uint8Array>) {
      const reader = readableStream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.trim()) yield JSON.parse(line);
        }
      }
    }

    function convertChatMessage(res: OllamaChatResponse): ChatMessage[] {
      if (res.error) {
        throw new Error(res.error);
      }

      if (!res.message) {
        return [];
      }

      const { role, content, thinking, tool_calls: toolCalls } = res.message;

      if (role === "tool") {
        throw new Error(
          "Unexpected message received from backend with role = tool",
        );
      }

      const result: ChatMessage[] = [];

      if (role === "assistant") {
        const thinkingMessage: ThinkingChatMessage | null = thinking
          ? { role: "thinking", content: thinking }
          : null;

        if (thinkingMessage && !content) {
          return [thinkingMessage];
        }

        const chatMessage: ChatMessage = { role: "assistant", content };

        if (toolCalls?.length) {
          chatMessage.toolCalls = toolCalls.map((tc) => ({
            type: "function",
            id: `tc_${uuidv4()}`,
            function: {
              name: tc.function.name,
              arguments: JSON.stringify(tc.function.arguments),
            },
          }));
        }

        return thinkingMessage ? [thinkingMessage, chatMessage] : [chatMessage];
      }

      // Fallback for all other roles
      return [{ role, content }];
    }

    // Handle streaming responses
    for await (const chunk of streamToJSON(response.body)) {
      const ollamaResponse = chunk as OllamaChatResponse;
      for (const msg of convertChatMessage(ollamaResponse)) {
        yield msg;
      }
    }
  }

  /**
   * Generates the input payload for the VS Code API
   * Expects responses in Ollama chat format
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
              },
            );

            if (!response.ok) {
              throw new Error(
                `API request failed with status ${response.status}`,
              );
            }

            const responseBody = await response.json();
            return responseBody.embeddings || responseBody.data || [];
          } catch (e) {
            console.error(`Error fetching embeddings for chunk:`, chunk, e);
            return [];
          }
        }),
      )
    ).flat();
  }
}

export default SSIDevBuddyOnPremises;
