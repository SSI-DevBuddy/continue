import { streamResponse, streamSse } from "@continuedev/fetch";
import { SSI_DEVBUDDY_CONFIG } from "../../../SSI_DEVBUDDY_CONFIG.js";
import { ChatMessage, CompletionOptions, LLMOptions } from "../../index.js";
import { safeParseToolCallArgs } from "../../tools/parseArgs.js";
import { renderChatMessage, stripImages } from "../../util/messageContent.js";
import { BaseLLM } from "../index.js";

class SSIDevBuddy extends BaseLLM {
  static providerName = "ssi-devbuddy";

  constructor(options: LLMOptions) {
    super(options);

    // Set apiBase from config file (fixed configuration)
    if (!this.apiBase) {
      this.apiBase = SSI_DEVBUDDY_CONFIG.API_BASE;
    }
  }

  // Enhanced message conversion for Python server
  private convertMessage(message: ChatMessage): any {
    if (message.role === "tool") {
      return {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: message.toolCallId,
            content: renderChatMessage(message) || undefined,
          },
        ],
      };
    } else if (message.role === "assistant" && message.toolCalls) {
      return {
        role: "assistant",
        content: message.toolCalls.map((toolCall) => ({
          type: "tool_use",
          id: toolCall.id,
          name: toolCall.function?.name,
          input: safeParseToolCallArgs(toolCall),
        })),
      };
    } else if (message.role === "thinking" && !message.redactedThinking) {
      return {
        role: "assistant",
        content: [
          {
            type: "thinking",
            thinking: message.content,
            signature: message.signature,
          },
        ],
      };
    } else if (message.role === "thinking" && message.redactedThinking) {
      return {
        role: "assistant",
        content: [
          {
            type: "redacted_thinking",
            data: message.redactedThinking,
          },
        ],
      };
    }

    if (typeof message.content === "string") {
      return {
        role: message.role,
        content: [
          {
            type: "text",
            text: message.content,
          },
        ],
      };
    }

    return {
      role: message.role,
      content: message.content.map((part) => {
        if (part.type === "text") {
          return {
            type: "text",
            text: part.text,
          };
        }
        if (part.type === "imageUrl" && part.imageUrl) {
          return {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: part.imageUrl.url.split(",")[1],
            },
          };
        }
        return part;
      }),
    };
  }

  public convertMessages(msgs: ChatMessage[]): any[] {
    const filteredmessages = msgs.filter(
      (m) => m.role !== "system" && !!m.content,
    );

    const messages = filteredmessages.map((message) => {
      return this.convertMessage(message);
    });
    return messages;
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

  protected async *_streamChat(
    messages: ChatMessage[],
    signal: AbortSignal,
    options: CompletionOptions,
  ): AsyncGenerator<ChatMessage> {
    // Use the API key from the config (set by addUserTokenForSSIDevBuddy)
    const apiKey = this.apiKey;

    if (!apiKey) {
      throw new Error(
        "SSI DevBuddy API key not set. Please log in first to authenticate.",
      );
    }

    const systemMessage = stripImages(
      messages.filter((m) => m.role === "system")[0]?.content ?? "",
    );

    const msgs = this.convertMessages(messages);

    // Prepare request payload for Python server
    const requestPayload: any = {
      messages: msgs,
      system: systemMessage,
      model: this.model || "claude",
      stream: true,
      // Let Python server handle all Claude parameters
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      topP: options.topP,
      topK: options.topK,
      stop: options.stop,
    };

    // Add tools if provided
    if (options.tools && options.tools.length > 0) {
      requestPayload.tools = options.tools.map((tool) => ({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters,
      }));
    }

    // Add tool choice if provided
    if (options.toolChoice) {
      requestPayload.tool_choice = {
        type: "tool",
        name: options.toolChoice.function.name,
      };
    }

    const response = await this.fetch(
      new URL("/api/vscode/chat", this.apiBase || SSI_DEVBUDDY_CONFIG.API_BASE),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
          ...this.requestOptions?.headers,
        },
        body: JSON.stringify(requestPayload),
        signal,
      },
    );

    if (response.status === 499) {
      return; // Aborted by user
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `SSI DevBuddy Python Server error: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    let completion = "";
    for await (const chunk of streamResponse(response)) {
      try {
        yield {
          role: "assistant",
          content: JSON.parse(chunk)?.text ?? "",
        };
        completion += chunk;
      } catch (ex) {}
    }

    // Let Python server handle all response processing
    yield* streamSse(response);
  }

  public supportsFim(): boolean {
    return false;
  }

  public supportsCompletions(): boolean {
    return true;
  }

  public supportsPrefill(): boolean {
    return false;
  }
}

export default SSIDevBuddy;
