import React, { useEffect, useRef, useState, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { WS_URL } from "@/config";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Terminal as TerminalIcon,
  RotateCw,
  Maximize2,
  Minimize2,
  Trash2,
  ZoomIn,
  ZoomOut,
  X,
  ShieldCheck,
} from "lucide-react";

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

const DEFAULT_FONT_SIZE = 14;

export const TerminalPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [fontSize, setFontSize] = useState<number>(DEFAULT_FONT_SIZE);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const initSocket = useCallback((term: Terminal, fitAddon: FitAddon) => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    term.write("\r\n\x1b[38;5;39m[Connecting to Web SSH terminal...]\x1b[0m\r\n");

    const wsUrl = `${WS_URL}/ws/terminal`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      term.write("\x1b[2J\x1b[H"); // Clear screen for fresh shell
      fitAddon.fit();
      ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
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
      } else {
        term.write("\r\n\x1b[33m[Session disconnected. Click 'Reconnect' to start a new shell session]\x1b[0m\r\n");
      }
    };
  }, []);

  const connect = useCallback(() => {
    if (!termRef.current || !fitAddonRef.current) return;
    setStatus("connecting");
    initSocket(termRef.current, fitAddonRef.current);
  }, [initSocket]);

  // Initialize xterm instance
  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: "block",
      fontFamily: '"JetBrains Mono", "Cascadia Code", Menlo, Monaco, Consolas, monospace',
      fontSize: DEFAULT_FONT_SIZE,
      lineHeight: 1.25,
      theme: TERMINAL_THEME,
      convertEol: true,
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    fitAddon.fit();

    // Forward terminal input to WebSocket
    const onDataDisposable = term.onData((data) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "input", data }));
      }
    });

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows })
          );
        }
      } catch {
        // ignore resize errors during unmount
      }
    });

    resizeObserver.observe(containerRef.current);

    // Start initial connection asynchronously
    const timer = setTimeout(() => {
      initSocket(term, fitAddon);
    }, 0);

    // Keepalive ping every 25 seconds
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 25000);

    return () => {
      clearTimeout(timer);
      clearInterval(pingInterval);
      onDataDisposable.dispose();
      resizeObserver.disconnect();
      if (wsRef.current) {
        wsRef.current.close();
      }
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, [initSocket]);

  // Handle font size change
  useEffect(() => {
    if (termRef.current && fitAddonRef.current) {
      termRef.current.options.fontSize = fontSize;
      fitAddonRef.current.fit();
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "resize",
            cols: termRef.current.cols,
            rows: termRef.current.rows,
          })
        );
      }
    }
  }, [fontSize]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  const clearScreen = () => {
    if (termRef.current) {
      termRef.current.clear();
      termRef.current.focus();
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground select-none">
      {/* Top Window Header */}
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-border bg-card px-3 sm:px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center p-1 rounded bg-secondary/80 border border-border text-primary">
            <TerminalIcon className="h-3.5 w-3.5" />
          </div>
          <span className="font-semibold text-xs sm:text-sm tracking-tight text-foreground font-mono">
            Web SSH Terminal
          </span>

          {/* Status Badge */}
          {status === "connected" && (
            <Badge
              variant="outline"
              className="flex items-center gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono px-2 py-0.5"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Connected</span>
            </Badge>
          )}

          {status === "connecting" && (
            <Badge
              variant="outline"
              className="flex items-center gap-1.5 border-amber-500/40 bg-amber-500/10 text-amber-400 text-[10px] font-mono px-2 py-0.5"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>Connecting...</span>
            </Badge>
          )}

          {status === "disconnected" && (
            <Badge
              variant="outline"
              className="flex items-center gap-1.5 border-destructive/40 bg-destructive/10 text-destructive text-[10px] font-mono px-2 py-0.5"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
              <span>Disconnected</span>
            </Badge>
          )}

          <div className="hidden md:flex items-center gap-1 text-[11px] font-mono text-muted-foreground/60 ml-2">
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
            <span>Bash PTY (xterm-256color)</span>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1">
          {/* Font Controls */}
          <div className="hidden sm:flex items-center rounded-md border border-border/40 bg-secondary/20 p-0.5 mr-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => setFontSize((f) => Math.max(11, f - 1))}
              title="Decrease Font Size"
            >
              <ZoomOut className="h-3 w-3" />
            </Button>
            <span className="px-1 text-[10px] font-mono text-muted-foreground">
              {fontSize}px
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => setFontSize((f) => Math.min(20, f + 1))}
              title="Increase Font Size"
            >
              <ZoomIn className="h-3 w-3" />
            </Button>
          </div>

          {/* Clear Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={clearScreen}
            className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Clear Screen"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>

          {/* Reconnect Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={connect}
            disabled={status === "connecting"}
            className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Reconnect Shell"
          >
            <RotateCw className={`h-3.5 w-3.5 ${status === "connecting" ? "animate-spin" : ""}`} />
          </Button>

          {/* Fullscreen Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>

          {/* Close Window Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.close()}
            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer ml-1"
            title="Close Window"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* Terminal Viewport */}
      <main
        ref={containerRef}
        className="flex-1 w-full overflow-hidden p-2 bg-background"
        onClick={() => termRef.current?.focus()}
      />
    </div>
  );
};

export default TerminalPage;
