import React, { useEffect, useRef, useState, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { WS_URL } from "@/config";
import { Button } from "@/components/ui/button";
import {
  Terminal as TerminalIcon,
  RotateCw,
  Maximize2,
  Minimize2,
  Trash2,
  ExternalLink,
  Play,
  AlertTriangle,
} from "lucide-react";

interface ContainerExecTerminalProps {
  containerName: string;
  isRunning: boolean;
  onStart?: () => void;
  className?: string;
}

const TERMINAL_THEME = {
  background: "#08090c",
  foreground: "#f0f6fc",
  cursor: "#38bdf8",
  cursorAccent: "#08090c",
  selectionBackground: "rgba(56, 189, 248, 0.25)",
  black: "#141720",
  red: "#f87171",
  green: "#4ade80",
  yellow: "#fbbf24",
  blue: "#38bdf8",
  magenta: "#c084fc",
  cyan: "#22d3ee",
  white: "#f0f6fc",
  brightBlack: "#334155",
  brightRed: "#ef4444",
  brightGreen: "#22c55e",
  brightYellow: "#eab308",
  brightBlue: "#0ea5e9",
  brightMagenta: "#a855f7",
  brightCyan: "#06b6d4",
  brightWhite: "#ffffff",
};

export const ContainerExecTerminal: React.FC<ContainerExecTerminalProps> = ({
  containerName,
  isRunning,
  onStart,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected" | "stopped">(
    isRunning ? "connecting" : "stopped"
  );
  const [shell, setShell] = useState<"auto" | "bash" | "sh">("auto");
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const initSocket = useCallback(
    (term: Terminal, fitAddon: FitAddon, shellType: string) => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      if (!isRunning) {
        setStatus("stopped");
        return;
      }

      setStatus("connecting");
      term.write(`\r\n\x1b[38;5;39m[Connecting to docker exec in ${containerName}...]\x1b[0m\r\n`);

      const wsUrl = `${WS_URL}/ws/terminal?container=${encodeURIComponent(
        containerName
      )}&shell=${encodeURIComponent(shellType)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("connected");
        term.write("\x1b[2J\x1b[H"); // Clear screen for clean exec prompt
        try {
          fitAddon.fit();
          ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
        } catch {
          // ignore fit error if element is transitioning
        }
      };

      ws.onmessage = (event) => {
        if (typeof event.data === "string") {
          term.write(event.data);
        }
      };

      ws.onerror = () => {
        setStatus("disconnected");
        term.write("\r\n\x1b[31m[WebSocket connection error]\x1b[0m\r\n");
      };

      ws.onclose = (event) => {
        setStatus("disconnected");
        if (event.code === 4001) {
          term.write("\r\n\x1b[31m[Session terminated: Unauthorized]\x1b[0m\r\n");
        } else if (event.code === 4000) {
          term.write("\r\n\x1b[33m[Container is not running]\x1b[0m\r\n");
        } else {
          term.write("\r\n\x1b[33m[Exec session ended. Click 'Reconnect' to start a new shell session]\x1b[0m\r\n");
        }
      };
    },
    [containerName, isRunning]
  );

  const reconnect = useCallback(() => {
    if (!termRef.current || !fitAddonRef.current) return;
    initSocket(termRef.current, fitAddonRef.current, shell);
  }, [initSocket, shell]);

  // Handle shell switch
  const handleShellChange = (newShell: "auto" | "bash" | "sh") => {
    setShell(newShell);
    if (termRef.current && fitAddonRef.current && isRunning) {
      initSocket(termRef.current, fitAddonRef.current, newShell);
    }
  };

  // Clear terminal buffer
  const handleClear = () => {
    if (termRef.current) {
      termRef.current.clear();
      termRef.current.focus();
    }
  };

  // Initialize xterm
  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: "block",
      fontFamily: '"JetBrains Mono", "Cascadia Code", Menlo, Monaco, Consolas, monospace',
      fontSize: 12,
      lineHeight: 1.25,
      theme: TERMINAL_THEME,
      convertEol: true,
      scrollback: 3000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    try {
      fitAddon.fit();
    } catch {
      // ignore
    }

    // Forward terminal keystrokes to WebSocket
    const onDataDisposable = term.onData((data) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "input", data }));
      }
    });

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows })
          );
        }
      } catch {
        // ignore
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    if (isRunning) {
      initSocket(term, fitAddon, shell);
    } else {
      setStatus("stopped");
    }

    return () => {
      onDataDisposable.dispose();
      resizeObserver.disconnect();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, [containerName, isRunning]);

  // Adjust terminal size whenever expansion changes
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        fitAddonRef.current?.fit();
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && termRef.current) {
          wsRef.current.send(
            JSON.stringify({
              type: "resize",
              cols: termRef.current.cols,
              rows: termRef.current.rows,
            })
          );
        }
      } catch {
        // ignore
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [isExpanded]);

  const statusBadge =
    !isRunning
      ? { text: "Stopped", color: "bg-slate-500/20 text-slate-400 border-slate-700/50" }
      : status === "connected"
      ? { text: "Connected", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" }
      : status === "connecting"
      ? { text: "Connecting...", color: "bg-amber-500/15 text-amber-300 border-amber-500/40 animate-pulse" }
      : { text: "Disconnected", color: "bg-rose-500/15 text-rose-300 border-rose-500/40" };

  const dotColor =
    !isRunning
      ? "bg-slate-500"
      : status === "connected"
      ? "bg-emerald-400"
      : status === "connecting"
      ? "bg-amber-400 animate-pulse"
      : "bg-rose-400";

  return (
    <div className={`rounded border border-border/80 bg-secondary/15 overflow-hidden flex flex-col ${className}`}>
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-secondary/40 border-b border-border/70 text-xs font-mono">
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-3.5 w-3.5 text-emerald-400" />
          <span className="font-semibold text-slate-200">docker exec</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded border flex items-center gap-1 ${statusBadge.color}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
            <span>{statusBadge.text}</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Shell switch */}
          <div className="flex items-center rounded border border-border/80 bg-secondary/50 p-0.5 text-[10px]">
            {(["auto", "bash", "sh"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleShellChange(s)}
                className={`px-1.5 py-0.5 rounded uppercase font-mono cursor-pointer transition-colors ${
                  shell === s
                    ? "bg-primary/20 text-sky-300 font-semibold border border-primary/30"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={`Use ${s} shell`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Reconnect button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={reconnect}
            disabled={!isRunning || status === "connecting"}
            className="h-6 px-2 text-[11px] font-mono cursor-pointer"
            title="Reconnect shell session"
          >
            <RotateCw className={`h-3 w-3 mr-1 ${status === "connecting" ? "animate-spin" : ""}`} />
            Reconnect
          </Button>

          {/* Clear button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="h-6 px-1.5 text-[11px] font-mono cursor-pointer"
            title="Clear terminal screen"
          >
            <Trash2 className="h-3 w-3" />
          </Button>

          {/* Expand / Minimize toggle */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="h-6 px-1.5 text-[11px] font-mono cursor-pointer"
            title={isExpanded ? "Collapse terminal" : "Expand terminal"}
          >
            {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </Button>

          {/* Pop-out standalone window */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              window.open(
                `/terminal?container=${encodeURIComponent(containerName)}`,
                "_blank",
                "noopener,noreferrer"
              )
            }
            className="h-6 px-1.5 text-[11px] font-mono cursor-pointer text-sky-400 hover:text-sky-300"
            title="Open in full-screen window"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Terminal Container */}
      <div className="relative w-full bg-[#08090c]">
        {!isRunning && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 p-4 bg-black/85 backdrop-blur-xs text-center text-xs font-mono">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <span className="text-slate-300">
              Container <span className="text-amber-300 font-semibold">'{containerName}'</span> is not running.
            </span>
            <span className="text-muted-foreground text-[11px]">
              Executing commands requires the container to be in running state.
            </span>
            {onStart && (
              <Button
                type="button"
                variant="success"
                size="sm"
                onClick={onStart}
                className="mt-1 h-7 px-3 text-xs font-mono cursor-pointer"
              >
                <Play className="h-3 w-3 mr-1 fill-current" />
                Start Container
              </Button>
            )}
          </div>
        )}

        <div
          ref={containerRef}
          className="w-full p-2"
          style={{ height: isExpanded ? "400px" : "210px" }}
        />
      </div>
    </div>
  );
};

export default ContainerExecTerminal;
