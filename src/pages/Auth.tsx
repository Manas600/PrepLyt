import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Lock,
  User,
  Briefcase,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react";
import logo from "@/assets/logo.png";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<AppRole>("student");
  const [adminSecret, setAdminSecret] = useState("");

  // VISIBILITY STATES
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminSecret, setShowAdminSecret] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const { signUp, signIn, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const roleParam = searchParams.get("role");
    if (
      roleParam &&
      (roleParam === "student" ||
        roleParam === "expert" ||
        roleParam === "admin")
    ) {
      setRole(roleParam as AppRole);
    }
  }, [location]);

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!isLogin && role === "admin" && adminSecret !== "admin123") {
        throw new Error("Invalid Admin Code. Access Denied.");
      }

      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast({
          title: "Welcome back!",
          description: "Successfully logged in.",
        });
      } else {
        const { error } = await signUp(email, password, name, role);
        if (error) throw error;
        toast({
          title: "Please confirm your email",
          description: `Hey, ${role}!`,
        });
        setIsLogin(true);
      }
    } catch (error: any) {
      let msg = error.message;
      if (msg.includes("invalid_credentials"))
        msg = "Invalid email or password.";

      toast({
        title: isLogin ? "Login Failed" : "Signup Failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8 flex flex-col items-center">
          <img
            src={logo}
            alt="PrepLyt Logo"
            className="h-16 w-auto object-contain mb-4"
          />
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Prep<span className="text-primary">Lyt</span>
          </h1>
          <p className="text-muted-foreground mt-2">Your Interview Companion</p>
        </div>

        <Card className="border-border shadow-xl bg-card">
          <CardHeader>
            <CardTitle className="text-xl text-center text-foreground">
              {isLogin ? "Sign In" : "Create Account"}
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Select your role to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              defaultValue="student"
              value={role}
              onValueChange={(v) => setRole(v as AppRole)}
              className="w-full mb-6"
            >
              <TabsList className="grid w-full grid-cols-3 bg-muted/50">
                <TabsTrigger
                  value="student"
                  className="data-[state=active]:bg-background data-[state=active]:text-primary"
                >
                  Student
                </TabsTrigger>
                <TabsTrigger
                  value="expert"
                  className="data-[state=active]:bg-background data-[state=active]:text-primary"
                >
                  Expert
                </TabsTrigger>
                <TabsTrigger
                  value="admin"
                  className="data-[state=active]:bg-background data-[state=active]:text-primary"
                >
                  Admin
                </TabsTrigger>
              </TabsList>

              <div className="mt-4 mb-6 text-center">
                {role === "student" && (
                  <div className="flex flex-col items-center text-primary animate-in zoom-in-95">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                      <User size={24} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Join sessions & get rated
                    </p>
                  </div>
                )}
                {role === "expert" && (
                  <div className="flex flex-col items-center text-primary animate-in zoom-in-95">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                      <Briefcase size={24} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Evaluate students & earn reputation
                    </p>
                  </div>
                )}
                {role === "admin" && (
                  <div className="flex flex-col items-center text-primary animate-in zoom-in-95">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                      <Shield size={24} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Organize & Manage Sessions
                    </p>
                  </div>
                )}
              </div>
            </Tabs>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label className="text-foreground">Full Name</Label>
                  <Input
                    required
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-background border-input text-foreground"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-foreground">Email</Label>
                <Input
                  required
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background border-input text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Password</Label>
                <div className="relative">
                  <Input
                    required
                    type={showPassword ? "text" : "password"} // Dynamic Type
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-background border-input text-foreground pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-primary"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {!isLogin && role === "admin" && (
                <div className="p-3 bg-muted/30 border border-border rounded-lg animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-1 text-foreground font-semibold text-sm">
                    <Lock size={14} /> Admin Verification
                  </div>
                  <div className="relative">
                    <Input
                      type={showAdminSecret ? "text" : "password"} // Dynamic Type
                      placeholder="Secret Code (admin123)"
                      value={adminSecret}
                      onChange={(e) => setAdminSecret(e.target.value)}
                      className="bg-background pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-primary"
                      onClick={() => setShowAdminSecret(!showAdminSecret)}
                    >
                      {showAdminSecret ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" />
                ) : isLogin ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setAdminSecret("");
                }}
                className="text-sm text-muted-foreground hover:text-primary underline underline-offset-4 transition-colors"
              >
                {isLogin
                  ? "New here? Create an account"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
