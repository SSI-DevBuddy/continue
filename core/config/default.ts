import { ConfigYaml } from "@continuedev/config-yaml";
import { SSI_DEVBUDDY_CONFIG } from "../../SSI_DEVBUDDY_CONFIG.js";

export const defaultConfig: ConfigYaml = {
  name: "Local Config",
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

const onPremisesConfigOllama: ConfigYaml = {
  name: "Local Agent",
  version: "1.0.0",
  schema: "v1",
  models: [
    {
      name: "SSI DevBuddy On-Premises (Ollama)",
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

const onPremisesConfigVLLM: ConfigYaml = {
  name: "Local Agent",
  version: "1.0.0",
  schema: "v1",
  models: [
    {
      name: "SSI DevBuddy On-Premises (VLLM)",
      provider: "ssi-devbuddy-on-premises-vllm",
      model: "Qwen/Qwen2.5-7B-Instruct",
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

const onPremisesConfig: ConfigYaml =
  SSI_DEVBUDDY_CONFIG.ON_PREMISES_LLM_PROVIDER === "vllm"
    ? onPremisesConfigVLLM
    : onPremisesConfigOllama;

export const defaultConfig: ConfigYaml =
  SSI_DEVBUDDY_CONFIG.APP_MODE === "on-premises"
    ? onPremisesConfig
    : cloudConfig;
