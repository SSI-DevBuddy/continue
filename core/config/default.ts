import { ConfigYaml } from "@continuedev/config-yaml";
import { SSI_DEVBUDDY_CONFIG } from "../../SSI_DEVBUDDY_CONFIG.js";

const cloudConfig: ConfigYaml = {
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
    {
      provider: "codebase",
    },
    {
      provider: "folder",
    },
  ],
};

const onPremisesConfig: ConfigYaml = {
  name: "Local Agent",
  version: "1.0.0",
  schema: "v1",
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
};

export const defaultConfig: ConfigYaml = 
  SSI_DEVBUDDY_CONFIG.APP_MODE === "on-premises" 
    ? onPremisesConfig 
    : cloudConfig;
