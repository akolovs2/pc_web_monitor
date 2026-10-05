import { useNavigate } from "react-router-dom";
import { Button } from "../components";
import { ArrowLeft, AlertTriangle } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background text-foreground">
      <div className="p-4 rounded-2xl bg-secondary/50 border border-border/80 mb-6 shadow-xl">
        <AlertTriangle className="h-12 w-12 text-amber-400" />
      </div>

      <h1 className="text-6xl font-black tracking-tight text-foreground mb-2">404</h1>
      <h2 className="text-xl font-semibold mb-2">Page Not Found</h2>
      <p className="text-sm text-muted-foreground max-w-sm mb-8">
        The page you are looking for doesn't exist or has been moved.
      </p>

      <Button
        onClick={() => navigate(-1)}
        variant="outline"
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Go back
      </Button>
    </div>
  );
};

export default NotFound;