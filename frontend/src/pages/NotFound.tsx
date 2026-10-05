import { useNavigate } from "react-router-dom";
import { Button } from "../components";
import { ArrowLeft, AlertTriangle } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background text-foreground select-none">
      <div className="p-3 rounded border border-amber-500/30 bg-amber-500/10 mb-4 text-amber-400">
        <AlertTriangle className="h-8 w-8" />
      </div>

      <h1 className="text-4xl font-bold font-mono tracking-tight text-foreground mb-1">404</h1>
      <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Endpoint Not Found</h2>
      <p className="text-xs text-muted-foreground/80 max-w-sm mb-6">
        The requested resource path does not exist on this node control plane.
      </p>

      <Button
        onClick={() => navigate(-1)}
        variant="outline"
        size="sm"
        className="gap-2 font-mono text-xs"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Return to Console
      </Button>
    </div>
  );
};

export default NotFound;