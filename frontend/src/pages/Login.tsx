import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../services/auth";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../components";
import { Server, Lock, AlertCircle } from "lucide-react";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await auth.login(username, password);
      navigate("/");
    } catch {
      setError("Invalid credentials. Please verify your username and password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground select-none">
      <Card className="w-full max-w-sm border border-border bg-card shadow-2xl">
        <CardHeader className="space-y-3 pb-5 text-center">
          <div className="mx-auto w-10 h-10 rounded border border-primary/30 bg-primary/10 flex items-center justify-center text-primary">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold tracking-tight text-slate-100">
              HomeLab Console
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Host authentication & telemetry gateway
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-2.5 rounded border border-destructive/40 bg-destructive/10 text-destructive text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1.5 text-left">
              <label
                htmlFor="username"
                className="text-xs font-mono font-medium text-slate-300"
              >
                Username
              </label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                className="h-8.5 text-xs font-mono bg-secondary/30 border-border placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label
                htmlFor="password"
                className="text-xs font-mono font-medium text-slate-300"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-8.5 text-xs font-mono bg-secondary/30 border-border placeholder:text-muted-foreground/50"
              />
            </div>

            <Button
              type="submit"
              loading={loading}
              className="w-full h-8.5 mt-2 text-xs font-mono font-medium tracking-wide uppercase"
            >
              <Lock className="h-3.5 w-3.5 mr-1.5" />
              Authenticate
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 text-center text-[11px] font-mono text-muted-foreground/60">
        Control Plane · System v2.0
      </div>
    </div>
  );
};

export default Login;