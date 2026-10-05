import { useState, useRef } from "react";
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
import { Server, Lock, AlertCircle, Key, Upload, CheckCircle2, X } from "lucide-react";

type AuthMode = "password" | "ssh_key";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("password");
  const [sshKeyContent, setSshKeyContent] = useState("");
  const [sshKeyName, setSshKeyName] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 200 * 1024) {
      setError("SSH key file is too large (maximum 200KB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setSshKeyContent(content);
      setSshKeyName(file.name);
      setError("");
    };
    reader.onerror = () => {
      setError("Failed to read SSH key file");
    };
    reader.readAsText(file);
  };

  const handleClearKey = () => {
    setSshKeyContent("");
    setSshKeyName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (authMode === "ssh_key" && !sshKeyContent.trim()) {
        throw new Error("Please select or paste an SSH private key (id_rsa, id_ed25519)");
      }

      await auth.login({
        username,
        password: authMode === "password" ? password : undefined,
        sshKey: authMode === "ssh_key" ? sshKeyContent : undefined,
        passphrase: authMode === "ssh_key" && passphrase ? passphrase : undefined,
      });

      navigate("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground select-none">
      <Card className="w-full max-w-sm border border-border bg-card shadow-2xl">
        <CardHeader className="space-y-3 pb-4 text-center">
          <div className="mx-auto w-10 h-10 rounded border border-primary/30 bg-primary/10 flex items-center justify-center text-primary">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold tracking-tight text-slate-100">
              HomeLab Console
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Direct host Linux & SSH authentication
            </CardDescription>
          </div>

          {/* Auth Method Segmented Control */}
          <div className="flex items-center rounded border border-border bg-secondary/40 p-0.5 mt-2">
            <button
              type="button"
              onClick={() => {
                setAuthMode("password");
                setError("");
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-mono font-medium rounded transition-all cursor-pointer ${
                authMode === "password"
                  ? "bg-secondary text-foreground border border-border shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              <Lock className="h-3 w-3" />
              <span>Password</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("ssh_key");
                setError("");
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-mono font-medium rounded transition-all cursor-pointer ${
                authMode === "ssh_key"
                  ? "bg-secondary text-foreground border border-border shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              <Key className="h-3 w-3" />
              <span>SSH Key</span>
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-2.5 rounded border border-destructive/40 bg-destructive/10 text-destructive text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Linux Username */}
            <div className="space-y-1.5 text-left">
              <label
                htmlFor="username"
                className="text-xs font-mono font-medium text-slate-300"
              >
                Linux Username
              </label>
              <Input
                id="username"
                type="text"
                placeholder="e.g. bomzh, root"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                className="h-8.5 text-xs font-mono bg-secondary/30 border-border placeholder:text-muted-foreground/50"
              />
            </div>

            {/* Mode A: Linux Password */}
            {authMode === "password" && (
              <div className="space-y-1.5 text-left">
                <label
                  htmlFor="password"
                  className="text-xs font-mono font-medium text-slate-300"
                >
                  System Password
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
            )}

            {/* Mode B: SSH Private Key */}
            {authMode === "ssh_key" && (
              <div className="space-y-3 text-left">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-medium text-slate-300 flex items-center justify-between">
                    <span>SSH Key (id_rsa / id_ed25519)</span>
                    {sshKeyContent && (
                      <button
                        type="button"
                        onClick={handleClearKey}
                        className="text-[10px] text-destructive hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <X className="h-3 w-3" /> Clear
                      </button>
                    )}
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                  />

                  {sshKeyContent ? (
                    <div className="flex items-center justify-between p-2 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono">
                      <div className="flex items-center gap-2 truncate">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                        <span className="truncate">{sshKeyName || "Private Key Loaded"}</span>
                      </div>
                      <span className="text-[10px] text-emerald-400/80 shrink-0 ml-2">
                        {sshKeyContent.length} B
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-8.5 text-xs font-mono border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                      >
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                        Choose Key File (id_rsa, id_ed25519)
                      </Button>

                      <div className="relative">
                        <textarea
                          placeholder="Or paste OpenSSH private key here..."
                          value={sshKeyContent}
                          onChange={(e) => {
                            setSshKeyContent(e.target.value);
                            setSshKeyName(e.target.value ? "Pasted Key" : "");
                          }}
                          rows={3}
                          className="w-full rounded border border-border bg-secondary/30 p-2 text-[10px] font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="passphrase"
                    className="text-[11px] font-mono text-muted-foreground"
                  >
                    Key Passphrase <span className="opacity-60">(optional)</span>
                  </label>
                  <Input
                    id="passphrase"
                    type="password"
                    placeholder="Leave empty if unencrypted"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    className="h-8 text-xs font-mono bg-secondary/30 border-border placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              loadingText="Authenticating..."
              className="w-full h-8.5 mt-2 text-xs font-mono font-medium tracking-wide uppercase"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Authenticate</span>
            </Button>
          </form>

          <p className="text-[10px] font-mono text-muted-foreground/70 text-center leading-relaxed">
            Verified directly against host PAM & <br />
            OpenSSH <span className="text-slate-300">~/.ssh/authorized_keys</span>
          </p>
        </CardContent>
      </Card>

      <div className="mt-6 text-center text-[11px] font-mono text-muted-foreground/60">
        Host Control Plane · System v2.0
      </div>
    </div>
  );
};

export default Login;