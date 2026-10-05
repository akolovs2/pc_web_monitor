import { useState, useEffect } from "react";
import { useMetrics } from "../hooks/useMetrics";
import useHasScrollbar from "../hooks/useHasScrollbar";
import useInfiniteScroll from "../hooks/useInfiniteScroll";
import ProgressCard from "../features/dashboard/ProgressCard";
import SearchableList from "../features/dashboard/SearchableList";
import ContainerItem from "../features/dashboard/ContainerItem";
import { INITIAL_LIST_COUNT, LIST_INCREMENT } from "../config";
import { auth } from "../services/auth";
import { Button, Badge, MetricsHistoryCard } from "../components";
import { Server, LogOut, User, Activity } from "lucide-react";

const Metrics = () => {
  const { data, containerAction } = useMetrics();
  const [containersSearch, setContainersSearch] = useState("");
  const [username, setUsername] = useState("");

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
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight">
                  {data.hostname || "HomeLab Monitor"}
                </span>
                <Badge
                  variant="outline"
                  className="hidden sm:inline-flex items-center gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-[11px] font-medium"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground bg-secondary/40 px-3 py-1.5 rounded-md border border-border/40">
              <User className="h-3.5 w-3.5" />
              <span>{username || "admin"}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => auth.logout()}
              className="gap-1.5 text-xs hover:border-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Quick Stats Grid */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-primary" />
              System Metrics
            </h2>
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-emerald-400">{runningContainers}</span> of{" "}
              <span>{(data.containers || []).length}</span> containers active
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <section className="pt-1">
          <MetricsHistoryCard />
        </section>

        {/* Containers List Section */}
        <section className="pt-1">
          <SearchableList
            title="Docker Containers"
            visibleCount={visibleContainers.length}
            totalCount={filteredContainers.length}
            searchValue={containersSearch}
            onSearchChange={setContainersSearch}
            placeholder="Search containers by name..."
            listRef={containersRef}
            hasScrollbar={containersHasScrollbar}
            onScroll={handleContainersScroll}
            isEmpty={visibleContainers.length === 0}
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
    </div>
  );
};

export default Metrics;