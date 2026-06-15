import { ConfigResult, ConfigValidationError } from "@continuedev/config-yaml";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { BrowserSerializedContinueConfig } from "core";
import { DEFAULT_CONTEXT_LENGTH } from "core/llm/constants";

export interface LlmConfig {
  key: string;
  label: string;
}

export interface ProjectContextMessage {
  message: string;
  role: string;
}

export type ConfigState = {
  configError: ConfigValidationError[] | undefined;
  config: BrowserSerializedContinueConfig;
  loading: boolean;
  defaultProjectId: number | undefined;
  projectLlms: LlmConfig[];
  selectedLlmKey: string | undefined;
  llmsLoading: boolean;
  projectContext: Record<number, ProjectContextMessage[]>;
  projectContextLoading: boolean;
  projectContextError: string | null;
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
  projectContext: {},
  projectContextLoading: false,
  projectContextError: null,
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
    setProjectContext: (
      state,
      {
        payload,
      }: PayloadAction<{ projectId: number; context: ProjectContextMessage[] }>,
    ) => {
      state.projectContext[payload.projectId] = payload.context;
      state.projectContextLoading = false;
      state.projectContextError = null;
    },
    setProjectContextLoading: (state, { payload }: PayloadAction<boolean>) => {
      state.projectContextLoading = payload;
    },
    setProjectContextError: (
      state,
      { payload }: PayloadAction<string | null>,
    ) => {
      state.projectContextError = payload;
      state.projectContextLoading = false;
    },
    clearProjectContext: (state) => {
      state.projectContext = {};
      state.projectContextError = null;
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
    selectProjectContext: (state) => (projectId: number | undefined) =>
      projectId ? state.projectContext[projectId] : undefined,
    selectProjectContextLoading: (state) => state.projectContextLoading,
    selectProjectContextError: (state) => state.projectContextError,
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
  setProjectContext,
  setProjectContextLoading,
  setProjectContextError,
  clearProjectContext,
} = configSlice.actions;

export const {
  selectSelectedChatModelContextLength,
  selectUIConfig,
  selectSelectedChatModel,
  selectDefaultProjectId,
  selectProjectLlms,
  selectSelectedLlmKey,
  selectLlmsLoading,
  selectProjectContext,
  selectProjectContextLoading,
  selectProjectContextError,
} = configSlice.selectors;

export default configSlice.reducer;
