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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md border-border/80 bg-card/95 shadow-2xl relative z-10 backdrop-blur-md">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-2 shadow-inner">
            <Server className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            PC Web Monitor
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Sign in to access your homelab monitoring dashboard
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="flex items-start gap-2.5 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username"
              id="username"
              type="text"
              placeholder="e.g. admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />

            <Input
              label="Password"
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              loading={loading}
              className="w-full h-10 mt-2 font-medium"
            >
              <Lock className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;