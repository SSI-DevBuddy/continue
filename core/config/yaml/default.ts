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

const onPremisesConfigYamlOllama: AssistantUnrolled = {
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
  name: "Local Agent",
  version: "1.0.0",
  schema: "v1",
};

const onPremisesConfigYamlVLLM: AssistantUnrolled = {
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
  name: "Local Agent",
  version: "1.0.0",
  schema: "v1",
};

const onPremisesConfigYaml: AssistantUnrolled = 
  SSI_DEVBUDDY_CONFIG.ON_PREMISES_LLM_PROVIDER === "vllm" 
    ? onPremisesConfigYamlVLLM 
    : onPremisesConfigYamlOllama;

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

const onPremisesConfigYamlJetBrainsOllama: AssistantUnrolled = {
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
  name: "Local Agent",
  version: "1.0.0",
  schema: "v1",
};

const onPremisesConfigYamlJetBrainsVLLM: AssistantUnrolled = {
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
  name: "Local Agent",
  version: "1.0.0",
  schema: "v1",
};

const onPremisesConfigYamlJetBrains: AssistantUnrolled = 
  SSI_DEVBUDDY_CONFIG.ON_PREMISES_LLM_PROVIDER === "vllm" 
    ? onPremisesConfigYamlJetBrainsVLLM 
    : onPremisesConfigYamlJetBrainsOllama;

export const defaultConfigYamlJetBrains: AssistantUnrolled = 
  SSI_DEVBUDDY_CONFIG.APP_MODE === "on-premises" 
    ? onPremisesConfigYamlJetBrains 
    : cloudConfigYamlJetBrains;
