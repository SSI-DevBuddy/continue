// Dummy project context for development/testing
// TODO: Replace with actual API call when backend endpoint is implemented
const DUMMY_PROJECT_CONTEXT = `

# Guidance:

The user is in a project that contains TypeScript code. The project has the following features

It allows users to manage a list of people and their addresses. The main entities are Person and Address. The project includes functions to get addresses from people, log information about people and their addresses, and manage groups of people.

Here are some examples of the code in the project:

1. Functions to get addresses from people:
function getFirstAddress(people: Person[]): Address;
function getFirstAddress(people: Person[]): Address;

2. Function to log information about a person and their address:
function logPersonWithAddress(person: Person<Address>): Person<Address>;
function logPersonWithAddress(person: Person<Address>): Person<Address>;

3. A class that manages groups of people and their addresses:
declare class Group {
  getPersonAddress(person: Person): Address;
}

# Instruction:

The user is asking a query, and you need to provide an answer based on the context of the project. Use the information about the functions and class methods to help answer the user's query.

# User Query:
`;

export interface ProjectContextMessage {
  message: string;
  role: string;
}

export interface FetchProjectContextParams {
  projectId: number;
  fullInput?: string;
  apiKey?: string;
  fetch?: typeof globalThis.fetch;
}

/**
 * Fetches project context from the backend API
 * Currently returns dummy data for development
 *
 * @param params - Parameters for fetching project context
 * @returns Promise resolving to array of context messages
 *
 * TODO: Implement actual API call when backend endpoint is ready:
 * - Endpoint: POST /chat/fetch_context or similar
 * - Headers: Authorization: Bearer ${apiKey}
 * - Body: { projectId, fullInput, options: {}, messages: [] }
 */
export async function fetchProjectContext(
  params: FetchProjectContextParams,
): Promise<ProjectContextMessage[]> {
  console.log("[fetchProjectContext] Called with params:", {
    projectId: params.projectId,
    hasApiKey: !!params.apiKey,
    fullInputLength: params.fullInput?.length,
  });

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  console.log("[fetchProjectContext] Returning dummy context", {
    messageLength: DUMMY_PROJECT_CONTEXT.length,
    preview: DUMMY_PROJECT_CONTEXT.substring(0, 100),
  });

  // Return dummy context
  return [
    {
      message: DUMMY_PROJECT_CONTEXT,
      role: "system",
    },
  ];

  /* TODO: Replace above with actual API call:
  
  const { projectId, fullInput = "", apiKey, fetch: fetchFn = fetch } = params;
  
  if (!apiKey) {
    throw new Error("API key is required");
  }

  const body = {
    query: "",
    fullInput,
    options: {},
    projectId,
    messages: [],
  };

  const response = await fetchFn(
    new URL("/chat/fetch_context", SSI_DEVBUDDY_CONFIG.CHAT_URL),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch project context: ${response.statusText}`);
  }

  const json = await response.json();
  return Array.isArray(json) ? json : [json];
  */
}
