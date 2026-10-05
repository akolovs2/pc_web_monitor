import React, { useState, useEffect, useRef, useCallback } from "react";
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
import type {
  ContainerDetails,
  ContainerActionType,
  UpdateContainerParams,
  RecreateContainerParams,
} from "@/types/Metrics";
import {
  Box,
  Plus,
  Trash2,
  Sliders,
  Activity,
  RotateCw,
  Play,
  Square,
  Network,
  Calendar,
  Layers,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Info,
  Terminal,
  AlertTriangle,
  Clock,
  Copy,
  Check,
} from "lucide-react";
import { fetchWithAuth } from "../../services/api";

interface ManageContainerDialogProps {
  containerName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInspect: (name: string) => Promise<ContainerDetails | null>;
  onUpdate: (name: string, params: UpdateContainerParams) => Promise<{ success: boolean; message?: string }>;
  onRecreate: (name: string, params: RecreateContainerParams) => Promise<{ success: boolean; message?: string }>;
  onAction: (name: string, action: ContainerActionType) => Promise<{ success: boolean; message?: string }>;
}

const RESTART_POLICY_OPTIONS: SelectOption[] = [
  {
    value: "unless-stopped",
    label: "unless-stopped",
    description: "Recommended (auto-restart unless stopped)",
  },
  {
    value: "always",
    label: "always",
    description: "Always restart container on exit",
  },
  {
    value: "on-failure",
    label: "on-failure",
    description: "Restart only on non-zero exit code",
  },
  {
    value: "no",
    label: "no",
    description: "Run once without auto-restart",
  },
];

export const ManageContainerDialog: React.FC<ManageContainerDialogProps> = ({
  containerName,
  open,
  onOpenChange,
  onInspect,
  onUpdate,
  onRecreate,
  onAction,
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "edit" | "logs">("overview");
  const [details, setDetails] = useState<ContainerDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [logs, setLogs] = useState<string>("");
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logTail, setLogTail] = useState<string>("150");
  const [showTimestamps, setShowTimestamps] = useState<boolean>(true);
  const [copiedLogs, setCopiedLogs] = useState<boolean>(false);

  // Edit / Recreate form state
  const [image, setImage] = useState("");
  const [name, setName] = useState("");
  const [ports, setPorts] = useState<{ host: string; container: string }[]>([]);
  const [envVars, setEnvVars] = useState<{ key: string; val: string }[]>([]);
  const [volumes, setVolumes] = useState<{ host: string; container: string }[]>([]);
  const [restartPolicy, setRestartPolicy] = useState("unless-stopped");
  const [command, setCommand] = useState("");

  // In-place update states
  const [inPlaceRestartPolicy, setInPlaceRestartPolicy] = useState("unless-stopped");
  const [inPlaceName, setInPlaceName] = useState("");

  // Action / Submit status
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const onInspectRef = useRef(onInspect);
  useEffect(() => {
    onInspectRef.current = onInspect;
  }, [onInspect]);

  // Load details on open or when containerName changes
  useEffect(() => {
    if (!open || !containerName) {
      setDetails(null);
      setStatusMessage(null);
      return;
    }

    let isMounted = true;
    const fetchDetails = async () => {
      setLoadingDetails(true);
      setStatusMessage(null);
      try {
        const res = await onInspectRef.current(containerName);
        if (!isMounted) return;

        if (res) {
          setDetails(res);
          setImage(res.image || "");
          setName(res.name || containerName);
          setInPlaceName(res.name || containerName);
          setRestartPolicy(res.restart_policy || "unless-stopped");
          setInPlaceRestartPolicy(res.restart_policy || "unless-stopped");
          setCommand(res.command || "");

          // Populate ports
          if (res.ports && res.ports.length > 0) {
            setPorts(
              res.ports.map((p) => ({
                host: p.host_port || "",
                container: p.container_port || "",
              }))
            );
          } else {
            setPorts([]);
          }

          // Populate env
          if (res.env && res.env.length > 0) {
            setEnvVars(
              res.env.map((e) => {
                const idx = e.indexOf("=");
                if (idx > -1) {
                  return { key: e.substring(0, idx), val: e.substring(idx + 1) };
                }
                return { key: e, val: "" };
              })
            );
          } else {
            setEnvVars([]);
          }

          // Populate volumes
          if (res.volumes && res.volumes.length > 0) {
            setVolumes(
              res.volumes.map((v) => ({
                host: v.host_path || "",
                container: v.container_path || "",
              }))
            );
          } else {
            setVolumes([]);
          }
        } else {
          setStatusMessage({ type: "error", text: `Could not fetch details for container '${containerName}'` });
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        setStatusMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Failed to load container details",
        });
      } finally {
        if (isMounted) setLoadingDetails(false);
      }
    };

    fetchDetails();

    return () => {
      isMounted = false;
    };
  }, [open, containerName]);

  const handleAddPort = () => setPorts((prev) => [...prev, { host: "", container: "" }]);
  const handleRemovePort = (idx: number) => setPorts((prev) => prev.filter((_, i) => i !== idx));

  const handleAddEnv = () => setEnvVars((prev) => [...prev, { key: "", val: "" }]);
  const handleRemoveEnv = (idx: number) => setEnvVars((prev) => prev.filter((_, i) => i !== idx));

  const handleAddVolume = () => setVolumes((prev) => [...prev, { host: "", container: "" }]);
  const handleRemoveVolume = (idx: number) => setVolumes((prev) => prev.filter((_, i) => i !== idx));

  const fetchLogs = useCallback(async () => {
    if (!containerName) return;
    setLoadingLogs(true);
    try {
      const res = await fetchWithAuth(
        `/docker/containers/${containerName}/logs?tail=${logTail}&timestamps=${showTimestamps}`
      );
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || "No logs available");
      } else {
        setLogs(`Failed to fetch logs: HTTP ${res.status}`);
      }
    } catch (err: unknown) {
      setLogs(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoadingLogs(false);
    }
  }, [containerName, logTail, showTimestamps]);

  const handleCopyLogs = () => {
    if (!logs) return;
    navigator.clipboard.writeText(logs);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  useEffect(() => {
    if (activeTab === "logs" && open && containerName) {
      fetchLogs();
    }
  }, [activeTab, open, containerName, fetchLogs]);

  // Quick Lifecycle Action (Start/Stop/Restart/Kill)
  const handleQuickAction = async (action: ContainerActionType) => {
    if (!containerName) return;
    setActionLoading(action);
    setStatusMessage(null);
    try {
      const res = await onAction(containerName, action);
      if (res.success) {
        setStatusMessage({ type: "success", text: res.message || `${action.toUpperCase()} action completed` });
        // Refresh details
        const updated = await onInspect(containerName);
        if (updated) setDetails(updated);
      } else {
        setStatusMessage({ type: "error", text: res.message || `Failed to execute ${action}` });
      }
    } catch (e: unknown) {
      setStatusMessage({ type: "error", text: e instanceof Error ? e.message : "Action failed" });
    } finally {
      setActionLoading(null);
    }
  };

  // In-Place Update (Restart policy or Rename)
  const handleApplyInPlaceUpdate = async () => {
    if (!containerName) return;
    setSubmitting(true);
    setStatusMessage(null);
    try {
      const res = await onUpdate(containerName, {
        restart_policy: inPlaceRestartPolicy !== details?.restart_policy ? inPlaceRestartPolicy : undefined,
        new_name: inPlaceName.trim() !== containerName ? inPlaceName.trim() : undefined,
      });

      if (res.success) {
        setStatusMessage({ type: "success", text: res.message || "Container settings updated" });
        const targetName = inPlaceName.trim() || containerName;
        const updated = await onInspect(targetName);
        if (updated) setDetails(updated);
      } else {
        setStatusMessage({ type: "error", text: res.message || "Failed to update settings" });
      }
    } catch (e: unknown) {
      setStatusMessage({ type: "error", text: e instanceof Error ? e.message : "Update failed" });
    } finally {
      setSubmitting(false);
    }
  };

  // Recreate Container (Full edit)
  const handleRecreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!containerName) return;
    if (!image.trim()) {
      setStatusMessage({ type: "error", text: "Image name is required to recreate the container" });
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);

    const formattedPorts = ports
      .filter((p) => p.host.trim() && p.container.trim())
      .map((p) => `${p.host.trim()}:${p.container.trim()}`);

    const formattedEnv = envVars
      .filter((ev) => ev.key.trim())
      .map((ev) => `${ev.key.trim()}=${ev.val.trim()}`);

    const formattedVolumes = volumes
      .filter((v) => v.host.trim() && v.container.trim())
      .map((v) => `${v.host.trim()}:${v.container.trim()}`);

    try {
      const res = await onRecreate(containerName, {
        image: image.trim(),
        new_name: name.trim() || undefined,
        ports: formattedPorts.length > 0 ? formattedPorts : undefined,
        env: formattedEnv.length > 0 ? formattedEnv : undefined,
        volumes: formattedVolumes.length > 0 ? formattedVolumes : undefined,
        restart_policy: restartPolicy,
        command: command.trim() || undefined,
      });

      if (res.success) {
        setStatusMessage({
          type: "success",
          text: res.message || `Container '${name.trim() || containerName}' successfully recreated!`,
        });
        setTimeout(() => {
          onOpenChange(false);
        }, 1200);
      } else {
        setStatusMessage({
          type: "error",
          text: res.message || "Failed to recreate container",
        });
      }
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Container recreation failed",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isRunning = details?.status === "running";
  const isRestarting = details?.status === "restarting";

  const statusBadgeClass = isRunning
    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
    : isRestarting
    ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
    : "bg-secondary text-muted-foreground border-border";

  const dotColorClass = isRunning
    ? "bg-emerald-400"
    : isRestarting
    ? "bg-amber-400 animate-pulse"
    : "bg-slate-400";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl bg-card border-border shadow-2xl p-5 select-none max-h-[92vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="space-y-2 pb-3 text-left border-b border-border/60 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded bg-secondary/80 border border-border text-emerald-400 shrink-0">
                <Box className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-sm font-semibold text-slate-100 font-mono truncate">
                    {containerName}
                  </DialogTitle>
                  {details && (
                    <span
                      className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border flex items-center gap-1 ${statusBadgeClass}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${dotColorClass}`} />
                      {details.status}
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-mono text-muted-foreground truncate">
                  {details?.image || "Inspecting container..."}
                </p>
              </div>
            </div>

            {/* Quick Action buttons in header */}
            {details && (
              <div className="flex items-center gap-1 shrink-0">
                {isRunning ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAction("stop")}
                      disabled={!!actionLoading}
                      className="h-7 px-2 text-xs font-mono hover:text-destructive hover:border-destructive cursor-pointer"
                      title="Stop container"
                    >
                      <Square className="h-3 w-3 fill-current mr-1" />
                      Stop
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleQuickAction("restart")}
                      disabled={!!actionLoading}
                      className="h-7 px-2 text-xs font-mono cursor-pointer"
                      title="Restart container"
                    >
                      <RotateCw className="h-3 w-3 mr-1" />
                      Restart
                    </Button>
                  </>
                ) : isRestarting ? (
                  <>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleQuickAction("stop")}
                      disabled={!!actionLoading}
                      className="h-7 px-2 text-xs font-mono bg-rose-950/70 border border-rose-600/50 text-rose-300 hover:bg-rose-900 cursor-pointer"
                      title="Stop crash loop"
                    >
                      <Square className="h-3 w-3 fill-current mr-1" />
                      Stop
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAction("kill")}
                      disabled={!!actionLoading}
                      className="h-7 px-2 text-xs font-mono border-rose-500/50 text-rose-300 hover:bg-rose-950 cursor-pointer"
                      title="Force kill container"
                    >
                      Kill
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleQuickAction("restart")}
                      disabled={!!actionLoading}
                      className="h-7 px-2 text-xs font-mono cursor-pointer"
                      title="Restart container"
                    >
                      <RotateCw className="h-3 w-3 mr-1" />
                      Restart
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => handleQuickAction("start")}
                    disabled={!!actionLoading}
                    className="h-7 px-2.5 text-xs font-mono cursor-pointer"
                    title="Start container"
                  >
                    <Play className="h-3 w-3 fill-current mr-1" />
                    Start
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 pt-1 border-t border-border/40">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                activeTab === "overview"
                  ? "bg-secondary text-foreground border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              <Activity className="h-3.5 w-3.5 text-sky-400" />
              State & Controls
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("logs")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                activeTab === "logs"
                  ? "bg-secondary text-foreground border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              <Terminal className="h-3.5 w-3.5 text-amber-400" />
              Logs
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("edit")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                activeTab === "edit"
                  ? "bg-secondary text-foreground border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              <Sliders className="h-3.5 w-3.5 text-emerald-400" />
              Edit & Recreate
            </button>
          </div>
        </DialogHeader>

        {/* Status / Alert Banner */}
        {statusMessage && (
          <div
            className={`mt-2 p-2.5 rounded border text-xs font-mono flex items-center gap-2 shrink-0 ${
              statusMessage.type === "success"
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                : "bg-rose-950/40 border-rose-500/40 text-rose-300"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            )}
            <span className="truncate">{statusMessage.text}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto pr-1 py-3 space-y-4">
          {loadingDetails && !details ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-2">
              <RotateCw className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs font-mono">Inspecting container configuration...</p>
            </div>
          ) : activeTab === "overview" ? (
            /* Tab 1: Overview & Controls */
            <div className="space-y-4">
              {/* Crash Loop Warning Banner if container is restarting */}
              {isRestarting && (
                <div className="p-3 rounded border border-amber-500/40 bg-amber-950/30 text-amber-200 text-xs font-mono space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-amber-400">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                    <span>Container is stuck in a crash-restart loop</span>
                  </div>
                  <p className="text-[11px] text-amber-300/80 leading-relaxed">
                    The process inside the container exits immediately with an error upon launching. Docker restart policy keeps restarting it indefinitely.
                  </p>
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleQuickAction("stop")}
                      disabled={!!actionLoading}
                      className="h-7 px-2.5 text-xs font-mono cursor-pointer"
                    >
                      <Square className="h-3 w-3 mr-1 fill-current" /> Stop Loop
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickAction("kill")}
                      disabled={!!actionLoading}
                      className="h-7 px-2.5 text-xs font-mono border-rose-500/50 text-rose-300 hover:bg-rose-950 cursor-pointer"
                    >
                      Force Kill
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setActiveTab("logs")}
                      className="h-7 px-2.5 text-xs font-mono cursor-pointer"
                    >
                      <Terminal className="h-3 w-3 mr-1 text-amber-400" /> View Crash Logs
                    </Button>
                  </div>
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded border border-border bg-secondary/20 space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                    <Box className="h-3 w-3 text-sky-400" /> Container ID
                  </span>
                  <p className="text-slate-200 font-semibold truncate">{details?.id || "N/A"}</p>
                </div>
                <div className="p-2.5 rounded border border-border bg-secondary/20 space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                    <Network className="h-3 w-3 text-indigo-400" /> IP / Network
                  </span>
                  <p className="text-slate-200 font-semibold truncate">
                    {details?.ip_address || "Host"} {details?.networks?.length ? `(${details.networks.join(",")})` : ""}
                  </p>
                </div>
                <div className="p-2.5 rounded border border-border bg-secondary/20 space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-amber-400" /> Created
                  </span>
                  <p className="text-slate-200 font-semibold truncate">{details?.created ? details.created.substring(0, 19).replace("T", " ") : "N/A"}</p>
                </div>
                <div className="p-2.5 rounded border border-border bg-secondary/20 space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                    <Activity className="h-3 w-3 text-emerald-400" /> Status
                  </span>
                  <p className="text-slate-200 font-semibold truncate">{details?.status}</p>
                </div>
              </div>

              {/* Port Bindings View */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold font-mono text-slate-300 flex items-center gap-1">
                  <Network className="h-3.5 w-3.5 text-sky-400" />
                  Port Mappings ({details?.ports?.length || 0})
                </span>
                {details?.ports && details.ports.length > 0 ? (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {details.ports.map((p, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-2.5 py-1 rounded border border-border/70 bg-secondary/20 text-xs font-mono text-slate-300"
                      >
                        <span className="text-emerald-400">{p.host_port ? `${p.host_port} (Host)` : "Not exposed"}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sky-300">{p.container_port}/{p.protocol} (Container)</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-mono text-muted-foreground/70 italic px-2">No ports published</p>
                )}
              </div>

              {/* Volume Mounts View */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold font-mono text-slate-300 flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5 text-indigo-400" />
                  Mounts & Volumes ({details?.volumes?.length || 0})
                </span>
                {details?.volumes && details.volumes.length > 0 ? (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {details.volumes.map((v, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-2.5 py-1 rounded border border-border/70 bg-secondary/20 text-xs font-mono text-slate-300 truncate"
                        title={`${v.host_path} -> ${v.container_path}`}
                      >
                        <span className="truncate max-w-[45%] text-slate-300">{v.host_path}</span>
                        <span className="text-[10px] text-muted-foreground px-1">:</span>
                        <span className="truncate max-w-[45%] text-amber-300">{v.container_path}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-mono text-muted-foreground/70 italic px-2">No volume mounts</p>
                )}
              </div>

              {/* In-Place Settings Update */}
              <div className="p-3 rounded border border-border bg-secondary/15 space-y-3">
                <div className="flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold font-mono text-slate-200">
                    Live Configuration Updates (No Restart)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-muted-foreground">Rename Container</label>
                    <Input
                      type="text"
                      value={inPlaceName}
                      onChange={(e) => setInPlaceName(e.target.value)}
                      placeholder="Container name"
                      className="h-8 text-xs font-mono bg-background border-border"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-muted-foreground">Restart Policy</label>
                    <Select
                      value={inPlaceRestartPolicy}
                      onChange={setInPlaceRestartPolicy}
                      options={RESTART_POLICY_OPTIONS}
                      size="sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleApplyInPlaceUpdate}
                    disabled={submitting}
                    className="h-7 text-xs font-mono"
                  >
                    {submitting ? "Applying..." : "Apply Live Settings"}
                  </Button>
                </div>
              </div>
            </div>
          ) : activeTab === "logs" ? (
            /* Tab 2: Logs Viewer with [{timedate}] and Controls */
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5 text-amber-400" />
                  <span>Output</span>
                  {logs && (
                    <span className="text-[10px] text-muted-foreground/60">
                      ({logs.split("\n").filter(Boolean).length} lines)
                    </span>
                  )}
                </span>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Timestamps toggle */}
                  <button
                    type="button"
                    onClick={() => setShowTimestamps((prev) => !prev)}
                    className={`flex items-center gap-1 h-6 px-2 text-[11px] font-mono rounded border transition-colors cursor-pointer select-none ${
                      showTimestamps
                        ? "bg-primary/20 text-sky-300 border-primary/40 font-medium"
                        : "bg-secondary/40 text-muted-foreground border-border hover:text-foreground"
                    }`}
                    title="Toggle timestamps [{timedate}]"
                  >
                    <Clock className="h-3 w-3" />
                    <span>[{showTimestamps ? "Time: ON" : "Time: OFF"}]</span>
                  </button>

                  {/* Tail selector */}
                  <div className="w-24">
                    <Select
                      value={logTail}
                      onChange={(val) => setLogTail(val)}
                      options={[
                        { value: "50", label: "50 lines" },
                        { value: "150", label: "150 lines" },
                        { value: "300", label: "300 lines" },
                        { value: "500", label: "500 lines" },
                      ]}
                      size="sm"
                      triggerClassName="h-6 text-[11px] px-1.5"
                    />
                  </div>

                  {/* Copy button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLogs}
                    disabled={!logs || loadingLogs}
                    className="h-6 px-2 text-[11px] font-mono cursor-pointer"
                    title="Copy logs to clipboard"
                  >
                    {copiedLogs ? (
                      <>
                        <Check className="h-3 w-3 mr-1 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>

                  {/* Refresh button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={fetchLogs}
                    disabled={loadingLogs}
                    className="h-6 px-2 text-[11px] font-mono cursor-pointer"
                  >
                    <RotateCw className={`h-3 w-3 mr-1 ${loadingLogs ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Logs Content Window */}
              <div className="p-3 rounded bg-black/95 border border-border font-mono text-[11px] text-slate-200 overflow-x-auto max-h-[380px] whitespace-pre-wrap select-text leading-relaxed font-mono">
                {loadingLogs ? (
                  <span className="text-muted-foreground animate-pulse">Loading logs from Docker daemon...</span>
                ) : logs ? (
                  logs.split("\n").map((line, idx) => {
                    const match = line.match(/^(\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\])\s?(.*)$/);
                    if (match) {
                      return (
                        <div key={idx} className="leading-5">
                          <span className="text-sky-400/80 font-mono mr-1.5 font-medium">
                            {match[1]}
                          </span>
                          <span>{match[2]}</span>
                        </div>
                      );
                    }
                    return (
                      <div key={idx} className="leading-5">
                        {line}
                      </div>
                    );
                  })
                ) : (
                  <span className="text-muted-foreground/60">No log output recorded for this container.</span>
                )}
              </div>
            </div>
          ) : (
            /* Tab 3: Edit & Recreate (Portainer Style) */
            <form id="recreate-form" onSubmit={handleRecreateSubmit} className="space-y-3.5">
              <div className="p-2.5 rounded border border-sky-500/20 bg-sky-950/20 text-xs font-mono text-sky-200 flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 text-sky-400 mt-0.5" />
                <span>
                  Recreating will stop, remove, and redeploy the container with your updated image, ports, env, and volumes. Persistent volume mounts are preserved.
                </span>
              </div>

              {/* Image Input */}
              <div className="space-y-1">
                <label className="text-xs font-mono font-medium text-slate-300">
                  Image Tag <span className="text-rose-400">*</span>
                </label>
                <Input
                  type="text"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="e.g. nginx:alpine or redis:7-alpine"
                  className="h-8 text-xs font-mono bg-secondary/30 border-border"
                  required
                />
              </div>

              {/* Container Name & Restart Policy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono font-medium text-slate-300">Container Name</label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="my-container"
                    className="h-8 text-xs font-mono bg-secondary/30 border-border"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono font-medium text-slate-300">Restart Policy</label>
                  <Select
                    value={restartPolicy}
                    onChange={setRestartPolicy}
                    options={RESTART_POLICY_OPTIONS}
                    size="sm"
                  />
                </div>
              </div>

              {/* Port Mappings */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-medium text-slate-300">
                    Port Mappings (Host : Container)
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddPort}
                    className="h-6 px-2 text-[11px] font-mono text-primary hover:text-primary hover:bg-primary/10"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Port
                  </Button>
                </div>
                {ports.length === 0 ? (
                  <p className="text-[11px] font-mono text-muted-foreground/60 italic">No port mappings configured</p>
                ) : (
                  <div className="space-y-1.5">
                    {ports.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <Input
                          type="text"
                          placeholder="Host (e.g. 8080)"
                          value={p.host}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPorts((prev) => prev.map((item, i) => (i === idx ? { ...item, host: val } : item)));
                          }}
                          className="h-7 text-xs font-mono bg-secondary/30 border-border flex-1"
                        />
                        <span className="text-xs font-mono text-muted-foreground">:</span>
                        <Input
                          type="text"
                          placeholder="Container (e.g. 80)"
                          value={p.container}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPorts((prev) => prev.map((item, i) => (i === idx ? { ...item, container: val } : item)));
                          }}
                          className="h-7 text-xs font-mono bg-secondary/30 border-border flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemovePort(idx)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Environment Variables */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-medium text-slate-300">
                    Environment Variables (KEY = VALUE)
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddEnv}
                    className="h-6 px-2 text-[11px] font-mono text-primary hover:text-primary hover:bg-primary/10"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Variable
                  </Button>
                </div>
                {envVars.length === 0 ? (
                  <p className="text-[11px] font-mono text-muted-foreground/60 italic">No environment variables set</p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {envVars.map((ev, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <Input
                          type="text"
                          placeholder="KEY"
                          value={ev.key}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEnvVars((prev) => prev.map((item, i) => (i === idx ? { ...item, key: val } : item)));
                          }}
                          className="h-7 text-xs font-mono bg-secondary/30 border-border flex-1"
                        />
                        <span className="text-xs font-mono text-muted-foreground">=</span>
                        <Input
                          type="text"
                          placeholder="VALUE"
                          value={ev.val}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEnvVars((prev) => prev.map((item, i) => (i === idx ? { ...item, val: val } : item)));
                          }}
                          className="h-7 text-xs font-mono bg-secondary/30 border-border flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveEnv(idx)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Volume Mounts */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-medium text-slate-300">
                    Volume Mounts (Host Path : Container Path)
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddVolume}
                    className="h-6 px-2 text-[11px] font-mono text-primary hover:text-primary hover:bg-primary/10"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Mount
                  </Button>
                </div>
                {volumes.length === 0 ? (
                  <p className="text-[11px] font-mono text-muted-foreground/60 italic">No persistent volumes mounted</p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {volumes.map((v, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <Input
                          type="text"
                          placeholder="/host/data"
                          value={v.host}
                          onChange={(e) => {
                            const val = e.target.value;
                            setVolumes((prev) => prev.map((item, i) => (i === idx ? { ...item, host: val } : item)));
                          }}
                          className="h-7 text-xs font-mono bg-secondary/30 border-border flex-1"
                        />
                        <span className="text-xs font-mono text-muted-foreground">:</span>
                        <Input
                          type="text"
                          placeholder="/var/lib/data"
                          value={v.container}
                          onChange={(e) => {
                            const val = e.target.value;
                            setVolumes((prev) => prev.map((item, i) => (i === idx ? { ...item, container: val } : item)));
                          }}
                          className="h-7 text-xs font-mono bg-secondary/30 border-border flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveVolume(idx)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Command override */}
              <div className="space-y-1">
                <label className="text-xs font-mono font-medium text-slate-300">Command Override (Optional)</label>
                <Input
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="e.g. sh -c 'sleep 10 && app'"
                  className="h-8 text-xs font-mono bg-secondary/30 border-border"
                />
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="pt-3 border-t border-border/60 flex items-center justify-between sm:justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs font-mono"
          >
            Close
          </Button>

          {activeTab === "edit" && (
            <Button
              type="submit"
              form="recreate-form"
              size="sm"
              variant="default"
              disabled={submitting}
              className="h-8 px-4 text-xs font-mono bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {submitting ? (
                <>
                  <RotateCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Recreating & Deploying...
                </>
              ) : (
                <>
                  <RotateCw className="h-3.5 w-3.5 mr-1.5" />
                  Redeploy & Recreate
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManageContainerDialog;
