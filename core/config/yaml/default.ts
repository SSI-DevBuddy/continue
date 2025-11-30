import { AssistantUnrolled } from "@continuedev/config-yaml";
import { SSI_DEVBUDDY_CONFIG } from "../../../SSI_DEVBUDDY_CONFIG.js";

const cloudConfigYaml: AssistantUnrolled = {
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
    {
      provider: "codebase",
    },
    {
      provider: "folder",
    },
  ],
  name: "Local Agent",
  version: "1.0.0",
  schema: "v1",
};

const onPremisesConfigYaml: AssistantUnrolled = {
  models: [
    {
      name: "SSI DevBuddy On-Premises",
      provider: "ssi-devbuddy-on-premises",
      model: "qwen2.5:14b-instruct",
      apiKey: "",
    },
  ],
  context: [
    {
      provider: "ssi-devbuddy-context",
    },
    {
      provider: "codebase",
    },
    {
      provider: "folder",
    },
  ],
  name: "Local Agent",
  version: "1.0.0",
  schema: "v1",
};

export const defaultConfigYaml: AssistantUnrolled = 
  SSI_DEVBUDDY_CONFIG.APP_MODE === "on-premises" 
    ? onPremisesConfigYaml 
    : cloudConfigYaml;

const cloudConfigYamlJetBrains: AssistantUnrolled = {
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
    {
      provider: "codebase",
    },
    {
      provider: "folder",
    },
  ],
  name: "Local Agent",
  version: "1.0.0",
  schema: "v1",
};

const onPremisesConfigYamlJetBrains: AssistantUnrolled = {
  models: [
    {
      name: "SSI DevBuddy On-Premises",
      provider: "ssi-devbuddy-on-premises",
      model: "qwen2.5:14b-instruct",
      apiKey: "",
    },
  ],
  context: [
    {
      provider: "ssi-devbuddy-context",
    },
    {
      provider: "codebase",
    },
    {
      provider: "folder",
    },
  ],
  name: "Local Agent",
  version: "1.0.0",
  schema: "v1",
};

export const defaultConfigYamlJetBrains: AssistantUnrolled = 
  SSI_DEVBUDDY_CONFIG.APP_MODE === "on-premises" 
    ? onPremisesConfigYamlJetBrains 
    : cloudConfigYamlJetBrains;
