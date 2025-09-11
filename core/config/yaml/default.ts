import { AssistantUnrolled } from "@continuedev/config-yaml";

export const defaultConfigYaml: AssistantUnrolled = {
  models: [
    {
      name: "SSI DevBuddy",
      provider: "ssi-devbuddy",
      model: "claude",
      apiKey: "",
    },
  ],
  context: [
    {
      provider: "ssi-devbuddy-context",
    },
  ],
  name: "Local Agent",
  version: "1.0.0",
  schema: "v1",
};

export const defaultConfigYamlJetBrains: AssistantUnrolled = {
  models: [
    {
      name: "SSI DevBuddy",
      provider: "ssi-devbuddy",
      model: "claude",
      apiKey: "",
    },
  ],
  context: [
    {
      provider: "ssi-devbuddy-context",
    },
  ],
  name: "Local Agent",
  version: "1.0.0",
  schema: "v1",
};
