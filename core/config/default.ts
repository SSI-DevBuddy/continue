import { ConfigYaml } from "@continuedev/config-yaml";

export const defaultConfig: ConfigYaml = {
  name: "Local Agent",
  version: "1.0.0",
  schema: "v1",
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
};
