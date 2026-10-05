import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import type { CreateContainerParams } from "@/types/Metrics";
import { Box, Plus, Trash2, Layers, AlertCircle, ArrowRight } from "lucide-react";

interface CreateContainerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeploy: (params: CreateContainerParams) => Promise<{ success: boolean; message?: string }>;
}

const PRESET_IMAGES = [
  { name: "nginx:alpine", desc: "Web server" },
  { name: "redis:alpine", desc: "In-memory cache" },
  { name: "postgres:16-alpine", desc: "SQL Database" },
  { name: "node:22-alpine", desc: "JavaScript runtime" },
  { name: "python:3.12-alpine", desc: "Python runtime" },
];

const RESTART_POLICY_OPTIONS: SelectOption[] = [
  { value: "unless-stopped", label: "unless-stopped (Recommended)" },
  { value: "always", label: "always" },
  { value: "on-failure", label: "on-failure" },
  { value: "no", label: "no (run once)" },
];

export const CreateContainerDialog: React.FC<CreateContainerDialogProps> = ({
  open,
  onOpenChange,
  onDeploy,
}) => {
  const [image, setImage] = useState("");
  const [name, setName] = useState("");
  const [ports, setPorts] = useState<{ host: string; container: string }[]>([]);
  const [envVars, setEnvVars] = useState<{ key: string; val: string }[]>([]);
  const [volumes, setVolumes] = useState<{ host: string; container: string }[]>([]);
  const [restartPolicy, setRestartPolicy] = useState("unless-stopped");
  const [command, setCommand] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setImage("");
    setName("");
    setPorts([]);
    setEnvVars([]);
    setVolumes([]);
    setRestartPolicy("unless-stopped");
    setCommand("");
    setError("");
  };

  const handleAddPort = () => setPorts((prev) => [...prev, { host: "", container: "" }]);
  const handleRemovePort = (idx: number) => setPorts((prev) => prev.filter((_, i) => i !== idx));

  const handleAddEnv = () => setEnvVars((prev) => [...prev, { key: "", val: "" }]);
  const handleRemoveEnv = (idx: number) => setEnvVars((prev) => prev.filter((_, i) => i !== idx));

  const handleAddVolume = () => setVolumes((prev) => [...prev, { host: "", container: "" }]);
  const handleRemoveVolume = (idx: number) => setVolumes((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image.trim()) {
      setError("Please specify a Docker Hub image (e.g. nginx:alpine)");
      return;
    }

    setLoading(true);
    setError("");

    // Format ports: ["8080:80"]
    const formattedPorts = ports
      .filter((p) => p.host.trim() && p.container.trim())
      .map((p) => `${p.host.trim()}:${p.container.trim()}`);

    // Format env: ["KEY=VAL"]
    const formattedEnv = envVars
      .filter((ev) => ev.key.trim())
      .map((ev) => `${ev.key.trim()}=${ev.val.trim()}`);

    // Format volumes: ["/host:/container"]
    const formattedVolumes = volumes
      .filter((v) => v.host.trim() && v.container.trim())
      .map((v) => `${v.host.trim()}:${v.container.trim()}`);

    try {
      const result = await onDeploy({
        image: image.trim(),
        name: name.trim() || undefined,
        ports: formattedPorts.length > 0 ? formattedPorts : undefined,
        env: formattedEnv.length > 0 ? formattedEnv : undefined,
        volumes: formattedVolumes.length > 0 ? formattedVolumes : undefined,
        restart_policy: restartPolicy,
        command: command.trim() || undefined,
      });

      if (result.success) {
        resetForm();
        onOpenChange(false);
      } else {
        setError(result.message || "Failed to deploy container");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Deployment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border shadow-2xl p-5 select-none max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1.5 pb-2 text-left border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-secondary/80 border border-border text-sky-400">
              <Box className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold tracking-tight text-slate-100">
                Deploy Container from Docker Hub
              </DialogTitle>
              <p className="text-[11px] font-mono text-muted-foreground">
                Pull and run any container image from registry
              </p>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 p-2.5 rounded border border-destructive/40 bg-destructive/10 text-destructive text-xs my-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Image & Quick Presets */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-medium text-slate-300 flex items-center justify-between">
              <span>Docker Hub Image *</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                e.g. nginx:alpine, redis:latest
              </span>
            </label>
            <Input
              type="text"
              placeholder="e.g. nginx:alpine, redis:latest, postgres:16"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              required
              className="h-8 text-xs font-mono bg-secondary/30 border-border placeholder:text-muted-foreground/50"
            />

            {/* Quick Suggestions */}
            <div className="flex flex-wrap gap-1 pt-1">
              {PRESET_IMAGES.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => setImage(preset.name)}
                  className="px-1.5 py-0.5 rounded border border-border/80 bg-secondary/40 text-[10px] font-mono text-muted-foreground hover:text-sky-300 hover:border-sky-500/40 transition-colors cursor-pointer"
                  title={preset.desc}
                >
                  + {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Container Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-medium text-slate-300 flex items-center justify-between">
              <span>Container Name <span className="opacity-60">(optional)</span></span>
            </label>
            <Input
              type="text"
              placeholder="e.g. my-app, prod-redis (leave empty for auto)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-xs font-mono bg-secondary/30 border-border placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Port Mappings */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-medium text-slate-300">
                Port Mappings
              </label>
              <button
                type="button"
                onClick={handleAddPort}
                className="text-[11px] font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3 w-3" /> Add Port
              </button>
            </div>

            {ports.length === 0 ? (
              <p className="text-[11px] font-mono text-muted-foreground/60 italic">
                No ports mapped (isolated from host network)
              </p>
            ) : (
              <div className="space-y-1.5">
                {ports.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Host (e.g. 8080)"
                      value={p.host}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPorts((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, host: val } : item))
                        );
                      }}
                      className="h-7.5 text-xs font-mono bg-secondary/30 border-border w-1/2"
                    />
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    <Input
                      type="number"
                      placeholder="Container (e.g. 80)"
                      value={p.container}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPorts((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, container: val } : item))
                        );
                      }}
                      className="h-7.5 text-xs font-mono bg-secondary/30 border-border w-1/2"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePort(idx)}
                      className="text-muted-foreground hover:text-destructive p-1 cursor-pointer"
                      title="Remove Port Mapping"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Environment Variables */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-medium text-slate-300">
                Environment Variables
              </label>
              <button
                type="button"
                onClick={handleAddEnv}
                className="text-[11px] font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3 w-3" /> Add Variable
              </button>
            </div>

            {envVars.length > 0 && (
              <div className="space-y-1.5">
                {envVars.map((ev, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="KEY (e.g. POSTGRES_PASSWORD)"
                      value={ev.key}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEnvVars((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, key: val } : item))
                        );
                      }}
                      className="h-7.5 text-xs font-mono bg-secondary/30 border-border w-1/2"
                    />
                    <span className="text-xs font-mono text-muted-foreground">=</span>
                    <Input
                      type="text"
                      placeholder="VALUE"
                      value={ev.val}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEnvVars((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, val: val } : item))
                        );
                      }}
                      className="h-7.5 text-xs font-mono bg-secondary/30 border-border w-1/2"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveEnv(idx)}
                      className="text-muted-foreground hover:text-destructive p-1 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Volume Mounts */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-medium text-slate-300">
                Volume Mounts
              </label>
              <button
                type="button"
                onClick={handleAddVolume}
                className="text-[11px] font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3 w-3" /> Add Volume
              </button>
            </div>

            {volumes.length > 0 && (
              <div className="space-y-1.5">
                {volumes.map((v, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="Host Path (/srv/data)"
                      value={v.host}
                      onChange={(e) => {
                        const val = e.target.value;
                        setVolumes((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, host: val } : item))
                        );
                      }}
                      className="h-7.5 text-xs font-mono bg-secondary/30 border-border w-1/2"
                    />
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    <Input
                      type="text"
                      placeholder="Container Path (/data)"
                      value={v.container}
                      onChange={(e) => {
                        const val = e.target.value;
                        setVolumes((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, container: val } : item))
                        );
                      }}
                      className="h-7.5 text-xs font-mono bg-secondary/30 border-border w-1/2"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveVolume(idx)}
                      className="text-muted-foreground hover:text-destructive p-1 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Restart Policy & Command */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-medium text-slate-300">
                Restart Policy
              </label>
              <Select
                value={restartPolicy}
                onChange={setRestartPolicy}
                options={RESTART_POLICY_OPTIONS}
                size="sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-medium text-slate-300">
                Command <span className="opacity-60">(optional)</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. npm start"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                className="h-8 text-xs font-mono bg-secondary/30 border-border placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border/60 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-xs font-mono"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              loadingText="Pulling & Deploying..."
              className="text-xs font-mono"
            >
              <Layers className="h-3.5 w-3.5 mr-1.5" />
              Deploy Container
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateContainerDialog;
