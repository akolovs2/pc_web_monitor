import type { SearchableListProps } from "../../types/Metrics";
import { Input, Badge, Card, CardHeader, CardTitle, CardContent } from "../../components";
import { Search, Inbox, Box } from "lucide-react";

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
}: SearchableListProps) => (
  <Card className="w-full bg-card border-border hover:border-border-hover transition-colors">
    <CardHeader className="pb-3 space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-center gap-2">
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
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <div className="relative flex-1 sm:w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 pl-8 text-xs font-mono bg-secondary/30 border-border placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-primary/60"
          />
        </div>
        {extraActions}
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
              {searchValue ? "Try changing your search query" : "No running or stopped containers"}
            </p>
          </div>
        ) : (
          children
        )}
      </div>
    </CardContent>
  </Card>
);

export default SearchableList;