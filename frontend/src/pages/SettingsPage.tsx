import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";
import { usePipelineSettings } from "@/lib/context/PipelineSettingsContext";

export default function SettingsPage() {
  const { settings, updateSettings, resetSettings } = usePipelineSettings();

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />
      <Card className="p-6 space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Pipeline Settings</h3>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Configure defaults for upload/batch outputs and Playground image source.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
              Default analysis output directory
            </label>
            <input
              type="text"
              value={settings.defaultAnalysisSaveDir}
              onChange={(e) => updateSettings({ defaultAnalysisSaveDir: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-primary)] text-sm"
              placeholder="./uploads"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
              Default batch output directory
            </label>
            <input
              type="text"
              value={settings.defaultBatchOutputDir}
              onChange={(e) => updateSettings({ defaultBatchOutputDir: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-primary)] text-sm"
              placeholder="./uploads"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Playground image source
          </label>
          <select
            value={settings.preferredPlaygroundImage}
            onChange={(e) =>
              updateSettings({
                preferredPlaygroundImage: e.target.value as "classified" | "orthomosaic",
              })
            }
            className="w-full md:w-80 px-3 py-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-primary)] text-sm"
          >
            <option value="classified">Classified orthomosaic (recommended)</option>
            <option value="orthomosaic">Original orthomosaic</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={() => {
            resetSettings();
            toast.success("Settings reset to default");
          }}>
            Reset to defaults
          </Button>
          <Button
            onClick={() => {
              toast.success("Settings saved");
            }}
          >
            Save Settings
          </Button>
        </div>
      </Card>
    </div>
  );
}
