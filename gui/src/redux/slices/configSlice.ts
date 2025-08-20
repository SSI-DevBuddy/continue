import { ConfigResult, ConfigValidationError } from "@continuedev/config-yaml";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { BrowserSerializedContinueConfig } from "core";
import { DEFAULT_MAX_TOKENS } from "core/llm/constants";

export type ConfigState = {
  configError: ConfigValidationError[] | undefined;
  config: BrowserSerializedContinueConfig;
  loading: boolean;
  defaultProjectId: number | undefined;
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
  },
  selectedModelByRole: {
    chat: null,
    apply: null,
    edit: null,
    summarize: null,
    autocomplete: null,
    rerank: null,
    embed: null,
  },
  rules: [],
};

const initialState: ConfigState = {
  configError: undefined,
  config: EMPTY_CONFIG,
  loading: false,
  defaultProjectId: undefined,
};

export const configSlice = createSlice({
  name: "config",
  initialState,
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
  },
  selectors: {
    selectSelectedChatModelContextLength: (state): number => {
      return (
        state.config.selectedModelByRole.chat?.contextLength ||
        DEFAULT_MAX_TOKENS
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
  },
});

export const {
  updateConfig,
  setConfigResult,
  setConfigLoading,
  setDefaultProjectId,
} = configSlice.actions;

export const {
  selectSelectedChatModelContextLength,
  selectUIConfig,
  selectSelectedChatModel,
  selectDefaultProjectId,
} = configSlice.selectors;

export default configSlice.reducer;
