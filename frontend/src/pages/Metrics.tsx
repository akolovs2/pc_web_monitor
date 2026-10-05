import { useState, useEffect } from "react";
import { useMetrics } from "../hooks/useMetrics";
import useHasScrollbar from "../hooks/useHasScrollbar";
import useInfiniteScroll from "../hooks/useInfiniteScroll";
import ProgressCard from "../features/dashboard/ProgressCard";
import SearchableList from "../features/dashboard/SearchableList";
import ContainerItem from "../features/dashboard/ContainerItem";
import CreateContainerDialog from "../features/dashboard/CreateContainerDialog";
import { INITIAL_LIST_COUNT, LIST_INCREMENT } from "../config";
import { auth } from "../services/auth";
import { Button, Badge, MetricsHistoryCard } from "../components";
import { Server, LogOut, User, Activity, Terminal, Plus } from "lucide-react";

const Metrics = () => {
  const { data, containerAction, createContainer } = useMetrics();
  const [containersSearch, setContainersSearch] = useState("");
  const [username, setUsername] = useState("");
  const [showDeployDialog, setShowDeployDialog] = useState(false);

  const [containersRef, containersHasScrollbar] = useHasScrollbar<HTMLDivElement>([
    data.containers,
    containersSearch,
  ]);

  const filteredContainers = (data.containers || []).filter((container) =>
    container.name.toLowerCase().includes(containersSearch.toLowerCase())
  );

  const {
    visibleItems: visibleContainers,
    handleScroll: handleContainersScroll,
  } = useInfiniteScroll(filteredContainers, INITIAL_LIST_COUNT, LIST_INCREMENT);

  useEffect(() => {
    auth.getUsername().then((name) => {
      if (name) setUsername(name);
    });
  }, []);

  const runningContainers = (data.containers || []).filter(
    (c) => c.status === "running"
  ).length;

  return (
    <div className="min-h-screen bg-background text-foreground select-none">
      {/* Top Industrial Control Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-secondary/80 border border-border text-sky-400">
              <Server className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono font-bold text-sm sm:text-base tracking-tight text-slate-100">
                {data.hostname || "homelab-node"}
              </span>
              <Badge
                variant="outline"
                className="flex items-center gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono px-2 py-0.5"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open("/terminal", "_blank", "noopener,noreferrer")}
              className="h-7.5 gap-1.5 text-xs font-mono border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 transition-all cursor-pointer shadow-sm"
              title="Open Web SSH in new window"
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>&gt;_ Web SSH</span>
            </Button>

            <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded border border-border">
              <User className="h-3 w-3 text-sky-400" />
              <span>{username || "admin"}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => auth.logout()}
              className="h-7.5 gap-1.5 text-xs font-mono hover:border-destructive hover:text-destructive hover:bg-destructive/10"
              title="End session"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Control Dashboard */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-5">
        {/* Quick Stats Grid */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-medium text-slate-300">
              <Activity className="h-3.5 w-3.5 text-sky-400" />
              <span>System Telemetry</span>
            </div>
            <div className="font-mono text-muted-foreground text-[11px]">
              <span className="text-emerald-400 font-semibold">{runningContainers}</span> /{" "}
              <span>{(data.containers || []).length} containers active</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <ProgressCard title="CPU" value={data.cpu} />
            <ProgressCard title="RAM" value={data.ram} />
            <ProgressCard
              title="Storage"
              value={data.storage ?? 0}
              extraInfo={
                data.storage_total
                  ? `${data.storage_used ?? 0} GB / ${data.storage_total} GB`
                  : undefined
              }
            />
          </div>
        </section>

        {/* Historical Trends Chart Section */}
        <section>
          <MetricsHistoryCard />
        </section>

        {/* Containers List Section */}
        <section>
          <SearchableList
            title="Container Workloads"
            visibleCount={visibleContainers.length}
            totalCount={filteredContainers.length}
            searchValue={containersSearch}
            onSearchChange={setContainersSearch}
            placeholder="Filter containers by name..."
            listRef={containersRef}
            hasScrollbar={containersHasScrollbar}
            onScroll={handleContainersScroll}
            isEmpty={visibleContainers.length === 0}
            extraActions={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeployDialog(true)}
                className="h-8 gap-1.5 text-xs font-mono border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 shrink-0 cursor-pointer"
                title="Deploy new container from Docker Hub"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Deploy Container</span>
                <span className="sm:hidden">Deploy</span>
              </Button>
            }
          >
            {visibleContainers.map((container) => (
              <ContainerItem
                key={container.id}
                {...container}
                onAction={containerAction}
              />
            ))}
          </SearchableList>
        </section>
      </main>

      {/* Deploy Container Dialog */}
      <CreateContainerDialog
        open={showDeployDialog}
        onOpenChange={setShowDeployDialog}
        onDeploy={createContainer}
      />
    </div>
  );
};

export default Metrics;