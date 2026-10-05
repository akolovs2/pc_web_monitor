import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  group?: string;
}

export interface SelectGroup<T extends string = string> {
  label: string;
  options: SelectOption<T>[];
}

export interface SelectProps<T extends string = string> {
  value?: T;
  onChange?: (value: T) => void;
  options?: SelectOption<T>[];
  groups?: SelectGroup<T>[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  size?: "sm" | "default" | "lg";
  icon?: React.ReactNode;
  align?: "left" | "right" | "auto";
  placement?: "auto" | "top" | "bottom";
  id?: string;
  name?: string;
  ariaLabel?: string;
}

export function Select<T extends string = string>({
  value,
  onChange,
  options,
  groups,
  placeholder = "Select option...",
  disabled = false,
  className,
  triggerClassName,
  menuClassName,
  size = "sm",
  icon,
  align = "auto",
  placement = "auto",
  id,
  name,
  ariaLabel,
}: SelectProps<T>) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [openUpward, setOpenUpward] = React.useState(false);
  const [effectiveAlignRight, setEffectiveAlignRight] = React.useState(false);
  const [maxMenuHeight, setMaxMenuHeight] = React.useState<number | undefined>(undefined);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Normalize groups & flat options
  const { normalizedGroups, flatOptions } = React.useMemo(() => {
    if (groups && groups.length > 0) {
      const flat = groups.flatMap((g) => g.options);
      return { normalizedGroups: groups, flatOptions: flat };
    }

    if (options && options.length > 0) {
      const hasGroups = options.some((opt) => !!opt.group);
      if (hasGroups) {
        const groupMap = new Map<string, SelectOption<T>[]>();
        const defaultGroupName = "General";

        for (const opt of options) {
          const gName = opt.group || defaultGroupName;
          if (!groupMap.has(gName)) {
            groupMap.set(gName, []);
          }
          groupMap.get(gName)!.push(opt);
        }

        const computedGroups: SelectGroup<T>[] = Array.from(groupMap.entries()).map(
          ([label, grpOptions]) => ({
            label,
            options: grpOptions,
          })
        );
        return { normalizedGroups: computedGroups, flatOptions: options };
      }

      return {
        normalizedGroups: [{ label: "", options }],
        flatOptions: options,
      };
    }

    return { normalizedGroups: [], flatOptions: [] };
  }, [options, groups]);

  const selectedOption = React.useMemo(() => {
    return flatOptions.find((opt) => opt.value === value);
  }, [flatOptions, value]);

  const [highlightedIndex, setHighlightedIndex] = React.useState<number>(-1);

  // Sync highlighted index when opened
  React.useEffect(() => {
    if (isOpen) {
      const idx = flatOptions.findIndex((opt) => opt.value === value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    } else {
      setHighlightedIndex(-1);
    }
  }, [isOpen, flatOptions, value]);

  // Dynamic positioning & boundary detection to prevent cropping
  React.useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportBelow = window.innerHeight - rect.bottom;
      const viewportAbove = rect.top;

      // Find closest scroll container or modal to prevent clipping inside dialogs
      const scrollParent = triggerRef.current.closest(
        ".overflow-y-auto, .overflow-auto, [role='dialog'], form"
      );
      let parentBelow = viewportBelow;
      let parentAbove = viewportAbove;

      if (scrollParent) {
        const pRect = scrollParent.getBoundingClientRect();
        parentBelow = pRect.bottom - rect.bottom;
        parentAbove = rect.top - pRect.top;
      }

      const spaceBelow = Math.min(viewportBelow, parentBelow);
      const spaceAbove = Math.min(viewportAbove, parentAbove);

      // Auto flip upward if space below is too small (e.g. less than 210px) and space above is larger
      const shouldFlip =
        placement === "top"
          ? true
          : placement === "bottom"
          ? false
          : spaceBelow < 210 && spaceAbove > spaceBelow;

      setOpenUpward(shouldFlip);

      // Calculate safe max-height to fit inside container
      const availableHeight = shouldFlip ? spaceAbove : spaceBelow;
      const safeMaxHeight = Math.max(100, Math.min(260, Math.floor(availableHeight - 12)));
      setMaxMenuHeight(safeMaxHeight);

      // Calculate horizontal alignment
      if (align === "right") {
        setEffectiveAlignRight(true);
      } else if (align === "left") {
        setEffectiveAlignRight(false);
      } else {
        // "auto": align right if menu would overflow right screen boundary
        setEffectiveAlignRight(rect.left + 240 > window.innerWidth - 16);
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, placement, align]);

  // Click outside listener
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (option: SelectOption<T>) => {
    if (option.disabled || disabled) return;
    onChange?.(option.value);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;

      case "Tab":
        setIsOpen(false);
        break;

      case "ArrowDown": {
        e.preventDefault();
        let nextIndex = highlightedIndex + 1;
        while (nextIndex < flatOptions.length && flatOptions[nextIndex].disabled) {
          nextIndex++;
        }
        if (nextIndex < flatOptions.length) {
          setHighlightedIndex(nextIndex);
        }
        break;
      }

      case "ArrowUp": {
        e.preventDefault();
        let prevIndex = highlightedIndex - 1;
        while (prevIndex >= 0 && flatOptions[prevIndex].disabled) {
          prevIndex--;
        }
        if (prevIndex >= 0) {
          setHighlightedIndex(prevIndex);
        }
        break;
      }

      case "Home": {
        e.preventDefault();
        const firstValid = flatOptions.findIndex((o) => !o.disabled);
        if (firstValid >= 0) setHighlightedIndex(firstValid);
        break;
      }

      case "End": {
        e.preventDefault();
        for (let i = flatOptions.length - 1; i >= 0; i--) {
          if (!flatOptions[i].disabled) {
            setHighlightedIndex(i);
            break;
          }
        }
        break;
      }

      case "Enter":
      case " ": {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < flatOptions.length) {
          const opt = flatOptions[highlightedIndex];
          if (!opt.disabled) {
            handleSelect(opt);
          }
        }
        break;
      }
    }
  };

  // Scroll active item into view
  React.useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && menuRef.current) {
      const activeEl = menuRef.current.querySelector(
        `[data-option-index="${highlightedIndex}"]`
      ) as HTMLElement | null;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Size specific styling
  const sizeClasses = {
    sm: "h-8 px-2.5 text-xs",
    default: "h-9 px-3 text-xs sm:text-sm",
    lg: "h-10 px-3.5 text-sm",
  }[size];

  const triggerTitle =
    selectedOption && typeof selectedOption.label === "string"
      ? selectedOption.label
      : undefined;

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-block w-full text-left", className)}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden native input for form submissions if name is provided */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={value ?? ""}
          id={id ? `${id}-hidden` : undefined}
        />
      )}

      {/* Trigger Button */}
      <button
        type="button"
        ref={triggerRef}
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        title={triggerTitle}
        onClick={() => {
          if (!disabled) setIsOpen((prev) => !prev);
        }}
        className={cn(
          "flex items-center justify-between w-full rounded border border-border bg-secondary/40 text-foreground font-mono transition-all select-none",
          "hover:bg-secondary/70 hover:border-border/80",
          "focus:outline-none focus:ring-1 focus:ring-primary/80 focus:border-primary/80",
          "disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
          sizeClasses,
          isOpen && "ring-1 ring-primary/80 border-primary/80 bg-secondary/60",
          triggerClassName
        )}
      >
        <div className="flex items-center gap-2 truncate pr-1">
          {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
          {selectedOption?.icon && (
            <span className="shrink-0">{selectedOption.icon}</span>
          )}
          <span
            className={cn(
              "truncate",
              !selectedOption && "text-muted-foreground/70"
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground/80 shrink-0 transition-transform duration-200 ml-1.5",
            isOpen && "rotate-180 text-primary"
          )}
        />
      </button>

      {/* Dropdown Menu Popup with Smart Placement (Up/Down) to prevent cropping */}
      {isOpen && (
        <div
          ref={menuRef}
          role="listbox"
          tabIndex={-1}
          style={{ maxHeight: maxMenuHeight ? `${maxMenuHeight}px` : undefined }}
          className={cn(
            "absolute z-50 min-w-full w-max max-w-[min(380px,calc(100vw-2.5rem))] rounded-md border border-border bg-[#0d0f14]/98 backdrop-blur-md shadow-2xl p-1 overflow-y-auto",
            openUpward
              ? "bottom-full mb-1.5 origin-bottom animate-in fade-in-0 slide-in-from-bottom-1 duration-100"
              : "top-full mt-1.5 origin-top animate-in fade-in-0 slide-in-from-top-1 duration-100",
            effectiveAlignRight ? "right-0 left-auto" : "left-0",
            menuClassName
          )}
        >
          {flatOptions.length === 0 ? (
            <div className="px-3 py-2 text-xs font-mono text-muted-foreground/60 text-center select-none">
              No options available
            </div>
          ) : (
            (() => {
              let globalIndex = 0;
              return normalizedGroups.map((grp, groupIdx) => {
                const showGroupHeader = Boolean(grp.label);

                return (
                  <div key={grp.label || `group-${groupIdx}`} className="space-y-0.5">
                    {showGroupHeader && (
                      <div className="px-2 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground/70 border-b border-border/40 mt-1.5 first:mt-0 select-none">
                        {grp.label}
                      </div>
                    )}
                    {grp.options.map((opt) => {
                      const itemIdx = globalIndex++;
                      const isSelected = opt.value === value;
                      const isHighlighted = itemIdx === highlightedIndex;
                      const optTitle =
                        typeof opt.label === "string" ? opt.label : undefined;

                      return (
                        <div
                          key={opt.value}
                          role="option"
                          aria-selected={isSelected}
                          aria-disabled={opt.disabled}
                          data-option-index={itemIdx}
                          title={optTitle}
                          onMouseEnter={() => {
                            if (!opt.disabled) setHighlightedIndex(itemIdx);
                          }}
                          onClick={() => handleSelect(opt)}
                          className={cn(
                            "w-full text-left px-2.5 py-1.5 text-xs font-mono rounded cursor-pointer flex items-center justify-between transition-colors select-none",
                            opt.disabled && "opacity-40 cursor-not-allowed pointer-events-none",
                            isHighlighted && !isSelected && "bg-secondary/80 text-slate-100",
                            isSelected && "bg-primary/20 text-sky-200 font-medium",
                            !isSelected && !isHighlighted && "text-slate-300 hover:bg-secondary/50"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            {opt.icon && (
                              <span className="shrink-0 text-muted-foreground">
                                {opt.icon}
                              </span>
                            )}
                            <div className="min-w-0">
                              <span className="block truncate font-medium">{opt.label}</span>
                              {opt.description && (
                                <span className="block text-[10px] text-muted-foreground/70 font-sans truncate">
                                  {opt.description}
                                </span>
                              )}
                            </div>
                          </div>

                          {isSelected && (
                            <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              });
            })()
          )}
        </div>
      )}
    </div>
  );
}
