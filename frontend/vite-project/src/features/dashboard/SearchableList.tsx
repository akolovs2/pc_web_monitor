import type { SearchableListProps } from "../../types/Metrics";
import { Input, Badge, Card, CardHeader, CardTitle, CardContent } from "../../components";
import { Search, Inbox } from "lucide-react";

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
}: SearchableListProps) => (
  <Card className="w-full bg-card/90 border-border/70 shadow-lg">
    <CardHeader className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <CardTitle className="text-lg font-bold tracking-tight text-foreground">
            {title}
          </CardTitle>
          <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5">
            {visibleCount} / {totalCount}
          </Badge>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-secondary/30 border-border/60 placeholder:text-muted-foreground/70"
        />
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