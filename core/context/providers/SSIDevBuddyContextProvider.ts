import {
  ContextItem,
  ContextProviderDescription,
  ContextProviderExtras,
} from "../../index.js";
import { BaseContextProvider } from "../index.js";

// Dummy project context for development/testing
// TODO: Replace with actual API call when backend is ready
const DUMMY_PROJECT_CONTEXT = `You are an expert React developer. Follow these best practices:

1. **Component Structure:**
   - Use functional components with hooks
   - Keep components small and focused
   - Use TypeScript for type safety

2. **State Management:**
   - Use useState for local state
   - Use useContext for shared state
   - Consider Redux for complex state

3. **Code Style:**
   - Use descriptive variable names
   - Add JSDoc comments for complex functions
   - Follow consistent formatting

4. **Performance:**
   - Memoize expensive calculations with useMemo
   - Use useCallback for functions passed as props
   - Implement proper key props in lists

5. **Testing:**
   - Write unit tests for utilities
   - Test component behavior, not implementation
   - Aim for good coverage of critical paths`;

interface ProjectContextMessage {
  message: string;
  role: string;
}

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
    console.log("[SSIDevBuddyContextProvider] getContextItems called", {
      hasSelectedProjectId: !!extras.selectedProjectId,
      hasCachedContext: !!extras.cachedProjectContext,
      selectedProjectId: extras.selectedProjectId,
    });

    try {
      // Use cached context if available
      if (extras.selectedProjectId && extras.cachedProjectContext) {
        const cachedContext =
          extras.cachedProjectContext[extras.selectedProjectId];
        console.log("[SSIDevBuddyContextProvider] Cached context lookup:", {
          projectId: extras.selectedProjectId,
          foundContext: !!cachedContext,
          contextLength: cachedContext?.length,
        });

        if (cachedContext && Array.isArray(cachedContext)) {
          const items = this.convertContextMessagesToItems(cachedContext);
          console.log(
            "[SSIDevBuddyContextProvider] Returning cached context items:",
            {
              itemCount: items.length,
              firstItemPreview: items[0]?.content?.substring(0, 100),
            },
          );
          return items;
        }
      }

      console.log("[SSIDevBuddyContextProvider] No cached context available");
      // No cache available - return empty array
      // Context will be loaded when project is selected
      return [];
    } catch (e) {
      console.warn(
        `[SSIDevBuddyContextProvider] Failed to get context from SSI DevBuddy context provider.\nError:\n${e}`,
      );
      return [];
    }
  }

  private convertContextMessagesToItems(
    messages: ProjectContextMessage[],
  ): ContextItem[] {
    return messages.map((item) => ({
      description: "SSI DevBuddy Project Context",
      content: item.message || "",
      name: this.options.title || "SSI DevBuddy Context",
    }));
  }
}

export default SSIDevBuddyContextProvider;
