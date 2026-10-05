import type { SearchableListProps, ContainerSortOption } from "../../types/Metrics";
import { Input, Badge, Card, CardHeader, CardTitle, CardContent } from "../../components";
import { Search, Inbox, Box, ArrowUpDown } from "lucide-react";

const SearchableList = ({
  title,
  visibleCount,
  totalCount,
  searchValue,
  onSearchChange,
  placeholder,
  listRef,
  hasScrollbar,
  onScroll,
  children,
  isEmpty,
  extraActions,
  statusFilter,
  onStatusFilterChange,
  statusCounts,
  sortOption,
  onSortChange,
}: SearchableListProps) => {
  const isResourceSort = sortOption?.startsWith("cpu") || sortOption?.startsWith("memory");

  return (
    <Card className="w-full bg-card border-border hover:border-border-hover transition-colors">
      <CardHeader className="pb-3 space-y-3">
        {/* Top Bar: Title, Count badge, Status Filter Pills, Action buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-1.5 rounded bg-secondary/80 border border-border text-muted-foreground">
              <Box className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xs font-semibold text-slate-300">
                {title}
              </CardTitle>
              <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 border-border">
                {visibleCount} / {totalCount}
              </Badge>
            </div>

            {/* Quick Status Filter Pills */}
            {statusFilter && onStatusFilterChange && statusCounts && (
              <div className="flex items-center gap-1 bg-secondary/40 p-0.5 rounded border border-border/80 text-[11px] font-mono ml-0 sm:ml-2">
                <button
                  type="button"
                  onClick={() => onStatusFilterChange("all")}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    statusFilter === "all"
                      ? "bg-secondary text-foreground font-semibold border border-border shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({statusCounts.all})
                </button>
                <button
                  type="button"
                  onClick={() => onStatusFilterChange("running")}
                  className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer ${
                    statusFilter === "running"
                      ? "bg-emerald-950/60 text-emerald-400 font-semibold border border-emerald-500/40"
                      : "text-muted-foreground hover:text-emerald-400"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Running ({statusCounts.running})
                </button>
                <button
                  type="button"
                  onClick={() => onStatusFilterChange("stopped")}
                  className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer ${
                    statusFilter === "stopped"
                      ? "bg-slate-800 text-slate-300 font-semibold border border-slate-600"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                  Stopped ({statusCounts.stopped})
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {extraActions}
          </div>
        </div>

        {/* Second Row: Search Input & Sort Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-border/40">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={placeholder}
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8 pl-8 text-xs font-mono bg-secondary/30 border-border placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-primary/60"
            />
          </div>

          {/* Sort Selector */}
          {sortOption && onSortChange && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-[11px] font-mono text-muted-foreground shrink-0 hidden sm:inline">
                Sort:
              </span>
              <div className="relative">
                <select
                  value={sortOption}
                  onChange={(e) => onSortChange(e.target.value as ContainerSortOption)}
                  className="h-8 pl-2.5 pr-7 text-xs font-mono bg-secondary/40 border border-border rounded text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:bg-secondary/60 transition-colors"
                >
                  <optgroup label="Activity / Status">
                    <option value="status-desc">Running First (Active)</option>
                    <option value="status-asc">Stopped First</option>
                  </optgroup>
                  <optgroup label="Name">
                    <option value="name-asc">Name: A → Z</option>
                    <option value="name-desc">Name: Z → A</option>
                  </optgroup>
                  <optgroup label="Live Resource Telemetry">
                    <option value="cpu-desc">CPU: Highest First (Live)</option>
                    <option value="cpu-asc">CPU: Lowest First (Live)</option>
                    <option value="memory-desc">RAM: Highest First (Live)</option>
                    <option value="memory-asc">RAM: Lowest First (Live)</option>
                  </optgroup>
                  <optgroup label="Date & Identity">
                    <option value="created-desc">Created: Newest First</option>
                    <option value="created-asc">Created: Oldest First</option>
                    <option value="id-asc">Container ID: A → Z</option>
                    <option value="id-desc">Container ID: Z → A</option>
                  </optgroup>
                </select>
                <ArrowUpDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>

              {/* Live resource auto-sorting pill indicator */}
              {isResourceSort && (
                <span
                  className="flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shrink-0"
                  title="Autosorting dynamically as metrics update"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div
          ref={listRef}
          className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1"
          style={{ paddingRight: hasScrollbar ? "0.5rem" : "0.25rem" }}
          onScroll={(e) => onScroll(e.currentTarget)}
        >
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Inbox className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm font-medium">No containers found</p>
              <p className="text-xs text-muted-foreground/70">
                {searchValue
                  ? "Try changing your search query"
                  : statusFilter !== "all"
                  ? `No ${statusFilter} containers found`
                  : "No running or stopped containers"}
              </p>
            </div>
          ) : (
            children
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchableList;