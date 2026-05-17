import { createContext, useContext, type ReactNode } from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";

export type PlaygroundImageSource = "classified" | "orthomosaic";

export interface PipelineSettings {
  defaultAnalysisSaveDir: string;
  defaultBatchOutputDir: string;
  preferredPlaygroundImage: PlaygroundImageSource;
}

const DEFAULT_SETTINGS: PipelineSettings = {
  defaultAnalysisSaveDir: "./uploads",
  defaultBatchOutputDir: "./uploads",
  preferredPlaygroundImage: "classified",
};

interface PipelineSettingsContextType {
  settings: PipelineSettings;
  setSettings: (next: PipelineSettings) => void;
  updateSettings: (patch: Partial<PipelineSettings>) => void;
  resetSettings: () => void;
}

const PipelineSettingsContext = createContext<PipelineSettingsContextType>({
  settings: DEFAULT_SETTINGS,
  setSettings: () => {},
  updateSettings: () => {},
  resetSettings: () => {},
});

function isValidSettings(value: unknown): value is PipelineSettings {
  if (!value || typeof value !== "object") return false;
  const v = value as PipelineSettings;
  const sourceOk = v.preferredPlaygroundImage === "classified" || v.preferredPlaygroundImage === "orthomosaic";
  return (
    typeof v.defaultAnalysisSaveDir === "string" &&
    typeof v.defaultBatchOutputDir === "string" &&
    sourceOk
  );
}

export function PipelineSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useLocalStorageState<PipelineSettings>(
    "pipeline-settings",
    DEFAULT_SETTINGS,
    isValidSettings,
  );

  const updateSettings = (patch: Partial<PipelineSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <PipelineSettingsContext.Provider value={{ settings, setSettings, updateSettings, resetSettings }}>
      {children}
    </PipelineSettingsContext.Provider>
  );
}

export function usePipelineSettings() {
  return useContext(PipelineSettingsContext);
}
