import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Video,
  Star,
  Trophy,
  Zap,
  ArrowRight,
  ChevronRight,
  Loader2,
  CheckCircle,
  Quote,
} from "lucide-react";
import logo from "@/assets/logo.png";

interface FeaturedExpert {
  id: string;
  name: string;
  role: string;
  image_url: string;
}

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [experts, setExperts] = useState<FeaturedExpert[]>([]);

  useEffect(() => {
    if (!loading && user) navigate("/dashboard");
  }, [user, loading, navigate]);

  // Fetch Experts for "Hall of Fame"
  useEffect(() => {
    const fetchExperts = async () => {
      // Cast to any to bypass strict type check for the new table
      const { data } = await (supabase
        .from("featured_experts" as any)
        .select("*")
        .limit(6) as any);

      if (data) setExperts(data as FeaturedExpert[]);
    };
    fetchExperts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Background Gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <img
                src={logo}
                alt="PrepLyt Logo"
                className="h-10 w-auto object-contain"
              />
              <span className="text-xl font-bold text-foreground">PrepLyt</span>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/auth">
                <Button variant="ghost">Sign in</Button>
              </Link>
              <Link to="/auth">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-20 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 border border-primary/20">
            <Zap className="w-4 h-4" />{" "}
            <span>Live GDs with Real Industry Mentors</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold text-foreground mb-6 leading-tight">
            Don't Just Prepare. <br />{" "}
            <span className="gradient-text">Perform.</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            The first platform to move beyond "Tips & Tricks". Join live
            simulation rounds, face actual corporate panelists, and get a
            quantifiable score on your confidence.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth">
              <Button size="lg" className="h-14 px-8 text-lg glow-effect gap-2">
                Start Practicing <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/auth?role=expert">
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg">
                Join as Expert
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* USPs Grid */}
      <section className="py-20 px-4 bg-card/50 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why PrepLyt Wins
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-background border border-border hover:border-primary/50 transition-all group">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Video className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Real-World Simulation</h3>
              <p className="text-muted-foreground">
                No recorded lectures. You speak, argue, and lead in a live video
                environment with 10 peers.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-background border border-border hover:border-primary/50 transition-all group">
              <div className="w-14 h-14 rounded-xl bg-star/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Star className="w-7 h-7 text-star" />
              </div>
              <h3 className="text-xl font-bold mb-3">Industry Validation</h3>
              <p className="text-muted-foreground">
                Get rated by Product Managers, HRs, and Tech Leads from top
                companies, not AI bots.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-background border border-border hover:border-primary/50 transition-all group">
              <div className="w-14 h-14 rounded-xl bg-success/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Trophy className="w-7 h-7 text-success" />
              </div>
              <h3 className="text-xl font-bold mb-3">Quantifiable Growth</h3>
              <p className="text-muted-foreground">
                Track your "Employability Score". See your confidence XP grow
                with every session.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* DYNAMIC: Our Experts */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Mentored by the Best</h2>
            <p className="text-muted-foreground text-lg">
              Sessions conducted by professionals from top tier companies.
            </p>
          </div>

          {experts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {experts.map((expert) => (
                <div
                  key={expert.id}
                  className="group relative overflow-hidden rounded-xl aspect-[4/5] bg-muted"
                >
                  <img
                    src={expert.image_url}
                    alt={expert.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
                    <p className="text-white font-bold">{expert.name}</p>
                    <p className="text-primary text-xs font-medium uppercase tracking-wider">
                      {expert.role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-12 border-2 border-dashed border-border rounded-xl">
              <p className="text-muted-foreground">
                Our expert panel is being updated. Join now to meet them live!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-primary/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Student Stories
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
              <Quote className="w-8 h-8 text-primary/20 mb-4" />
              <p className="text-foreground mb-6">
                "I always froze during GDs. After 5 sessions on PrepLyt, I not
                only spoke but led the discussion in my actual placement drive.
                Got placed at TCS!"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200"></div>
                <div>
                  <p className="font-bold text-sm">Rahul S.</p>
                  <p className="text-xs text-muted-foreground">
                    Engineering Student, Pune
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
              <Quote className="w-8 h-8 text-primary/20 mb-4" />
              <p className="text-foreground mb-6">
                "The feedback from the Amazon mentor was eye-opening. He told me
                exactly why I was getting rejected. Fixed it, and now I'm
                hired."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200"></div>
                <div>
                  <p className="font-bold text-sm">Priya M.</p>
                  <p className="text-xs text-muted-foreground">
                    MBA Graduate, Indore
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <img src={logo} alt="Logo" className="h-6 w-auto" />
          <span className="font-bold">PrepLyt</span>
        </div>
        <p className="text-sm text-muted-foreground">
          © 2024 PrepLyt. Empowering Tier 2/3 Talent.
        </p>
      </footer>
    </div>
  );
}
