import { ConfigResult, ConfigValidationError } from "@continuedev/config-yaml";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { BrowserSerializedContinueConfig } from "core";
import { DEFAULT_CONTEXT_LENGTH } from "core/llm/constants";

export interface LlmConfig {
  key: string;
  label: string;
}

export type ConfigState = {
  configError: ConfigValidationError[] | undefined;
  config: BrowserSerializedContinueConfig;
  loading: boolean;
  defaultProjectId: number | undefined;
  projectLlms: LlmConfig[];
  selectedLlmKey: string | undefined;
  llmsLoading: boolean;
};

export const EMPTY_CONFIG: BrowserSerializedContinueConfig = {
  slashCommands: [],
  contextProviders: [],
  tools: [],
  mcpServerStatuses: [],
  usePlatform: true,
  modelsByRole: {
    chat: [],
    apply: [],
    edit: [],
    summarize: [],
    autocomplete: [],
    rerank: [],
    embed: [],
    subagent: [],
  },
  selectedModelByRole: {
    chat: null,
    apply: null,
    edit: null,
    summarize: null,
    autocomplete: null,
    rerank: null,
    embed: null,
    subagent: null,
  },
  rules: [],
};

export const INITIAL_CONFIG_SLICE: ConfigState = {
  configError: undefined,
  config: EMPTY_CONFIG,
  loading: false,
  defaultProjectId: undefined,
  projectLlms: [],
  selectedLlmKey: undefined,
  llmsLoading: false,
};

export const configSlice = createSlice({
  name: "config",
  initialState: INITIAL_CONFIG_SLICE,
  reducers: {
    setConfigResult: (
      state,
      {
        payload: result,
      }: PayloadAction<ConfigResult<BrowserSerializedContinueConfig>>,
    ) => {
      const { config, errors } = result;
      if (!errors || errors.length === 0) {
        state.configError = undefined;
      } else {
        state.configError = errors;
      }

      // If an error is found in config on save,
      // We must invalidate the GUI config too,
      // Since core won't be able to load config
      // Don't invalidate the loaded config
      if (!config) {
        state.config = EMPTY_CONFIG;
      } else {
        state.config = config;
      }
      state.loading = false;
    },
    updateConfig: (
      state,
      { payload: config }: PayloadAction<BrowserSerializedContinueConfig>,
    ) => {
      state.config = config;
    },
    setConfigLoading: (state, { payload: loading }: PayloadAction<boolean>) => {
      state.loading = loading;
    },
    setDefaultProjectId: (
      state,
      { payload }: PayloadAction<{ value: number; force?: boolean }>,
    ) => {
      return {
        ...state,
        defaultProjectId: payload.value,
      };
    },
    setProjectLlms: (state, { payload }: PayloadAction<LlmConfig[]>) => {
      state.projectLlms = payload;
    },
    setSelectedLlmKey: (
      state,
      { payload }: PayloadAction<string | undefined>,
    ) => {
      state.selectedLlmKey = payload;
    },
    setLlmsLoading: (state, { payload }: PayloadAction<boolean>) => {
      state.llmsLoading = payload;
    },
  },
  selectors: {
    selectSelectedChatModelContextLength: (state): number => {
      return (
        state.config.selectedModelByRole.chat?.contextLength ||
        DEFAULT_CONTEXT_LENGTH
      );
    },
    selectSelectedChatModel: (state) => {
      return state.config.selectedModelByRole.chat;
    },
    selectUIConfig: (state) => {
      return state.config?.ui ?? null;
    },
    selectDefaultProjectId: (state) => {
      return state.defaultProjectId;
    },
    selectProjectLlms: (state) => state.projectLlms,
    selectSelectedLlmKey: (state) => state.selectedLlmKey,
    selectLlmsLoading: (state) => state.llmsLoading,
  },
});

export const {
  updateConfig,
  setConfigResult,
  setConfigLoading,
  setDefaultProjectId,
  setProjectLlms,
  setSelectedLlmKey,
  setLlmsLoading,
} = configSlice.actions;

export const {
  selectSelectedChatModelContextLength,
  selectUIConfig,
  selectSelectedChatModel,
  selectDefaultProjectId,
  selectProjectLlms,
  selectSelectedLlmKey,
  selectLlmsLoading,
} = configSlice.selectors;

export default configSlice.reducer;
