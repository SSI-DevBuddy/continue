import { SSI_DEVBUDDY_CONFIG } from "../../../SSI_DEVBUDDY_CONFIG.js";
import {
  ContextItem,
  ContextProviderDescription,
  ContextProviderExtras,
} from "../../index.js";
import { BaseContextProvider } from "../index.js";

class SSIDevBuddyContextProvider extends BaseContextProvider {
  static description: ContextProviderDescription = {
    title: "ssi-devbuddy-context",
    displayTitle: "SSI DevBuddy Context",
    description: "Retrieve a context item from SSI DevBuddy",
    type: "normal",
    renderInlineAs: "",
  };

  override get description(): ContextProviderDescription {
    return {
      title: this.options.title || "ssi-devbuddy-context",
      displayTitle: this.options.displayTitle || "SSI DevBuddy Context",
      description:
        this.options.description || "Retrieve a context item from SSI DevBuddy",
      type: "normal",
    };
  }

  async getContextItems(
    query: string,
    extras: ContextProviderExtras,
  ): Promise<ContextItem[]> {
    const body = {
      query: query || "",
      fullInput: extras.fullInput,
      options: this.options.options,
      projectId: extras.selectedProjectId,
      messages: [],
    };
    console.log("edta", extras);

    const response = await extras.fetch(
      new URL("/api/vscode/context_api", SSI_DEVBUDDY_CONFIG.API_BASE),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.options.options.apiKey}`,
        },
        body: JSON.stringify(body),
      },
    );
    console.log(body);
    const json = await response.json();
    console.log(json);

    try {
      const createContextItem = (item: any) => ({
        description: item.description ?? "SSI DevBuddy Context Item",
        content: item.content ?? "",
        name: item.name ?? this.options.title ?? "SSI DevBuddy Context",
      });

      return Array.isArray(json)
        ? json.map(createContextItem)
        : [createContextItem(json)];
    } catch (e) {
      console.warn(
        `Failed to parse response from SSI DevBuddy context provider.\nError:\n${e}\nResponse from server:\n`,
        json,
      );
      return [];
    }
  }
}

export default SSIDevBuddyContextProvider;
