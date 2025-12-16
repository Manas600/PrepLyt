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
  Quote,
  CheckCircle2,
  PlayCircle,
  Users,
  Briefcase
} from "lucide-react";
import logo from "@/assets/logo.png";

interface FeaturedExpert {
  id: string;
  name: string;
  role: string;
  // Removed image_url
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
      // Cast to any to bypass strict type check for the new table if types aren't updated
      const { data } = await (supabase
        .from('featured_experts' as any)
        .select('id, name, role') // Only select needed fields
        .limit(8) as any);
        
      if (data) setExperts(data as FeaturedExpert[]);
    };
    fetchExperts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 selection:text-primary overflow-x-hidden transition-colors duration-300">
      
      {/* --- BACKGROUND ARTISTRY --- */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-teal-500/10 blur-[120px] rounded-full animate-pulse [animation-duration:4s]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[60%] bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.1)_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      {/* --- HEADER --- */}
      <header className="fixed top-0 w-full z-50 border-b border-border/40 bg-background/70 backdrop-blur-md transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 to-blue-500 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-500"></div>
              <img src={logo} alt="PrepLyt Logo" className="relative h-10 w-10 object-contain drop-shadow-lg" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-foreground">Prep<span className="text-primary">Lyt</span></span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground font-medium">Sign in</Button>
            </Link>
            {/* UPDATED: Added mode=signup */}
            <Link to="/auth?mode=signup">
              <Button className="font-bold shadow-lg shadow-primary/20">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="relative z-10 pt-40 pb-32 px-6 flex flex-col items-center text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 border border-primary/20 text-primary text-sm font-semibold mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 backdrop-blur-sm shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
          </span>
          Live 1:1 Mentorship from Industry Leaders
        </div>

        {/* Headline */}
        <h1 className="max-w-5xl text-5xl md:text-7xl font-extrabold text-foreground mb-8 leading-[1.1] tracking-tight animate-in fade-in slide-in-from-bottom-6 duration-1000">
          Don't Just Prepare. <br />
          <span className="bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent drop-shadow-sm">Perform.</span>
        </h1>

        {/* Subheadline */}
        <p className="max-w-2xl text-lg md:text-xl text-muted-foreground mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
          The first platform to move beyond "Tips & Tricks". Join live simulation rounds, face actual corporate panelists, and get a quantifiable score on your confidence.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-6 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
          {/* UPDATED: Added mode=signup */}
          <Link to="/auth?mode=signup">
            <Button size="lg" className="h-16 px-10 text-xl font-bold rounded-full transition-all hover:scale-105 shadow-xl shadow-primary/20">
              Start Practicing <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
          </Link>
          <Link to="/auth?role=expert">
            <Button size="lg" variant="outline" className="h-16 px-10 text-xl border-foreground/10 bg-background/50 text-foreground hover:bg-foreground/5 rounded-full backdrop-blur-sm transition-all">
              Join as Expert
            </Button>
          </Link>
        </div>

        {/* Stats / Social Proof */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-16 border-t border-border/40 pt-10 animate-in fade-in zoom-in duration-1000 delay-500 w-full max-w-7xl">
          {[
            { label: "Active Students", value: "2,000+" },
            { label: "Mock GDs Hosted", value: "500+" },
            { label: "Expert Mentors", value: "50+" },
            { label: "Hired Graduates", value: "85%" },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center">
              <span className="text-3xl md:text-4xl font-bold text-foreground mb-1">{stat.value}</span>
              <span className="text-sm text-muted-foreground uppercase tracking-widest font-semibold">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* --- USP SECTION --- */}
      <section className="relative z-10 py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">Why PrepLyt Wins</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">We strip away the noise. No recorded lectures. Just pure, unadulterated practice in a high-stakes environment.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Video,
                title: "Real-World Simulation",
                desc: "You speak, argue, and lead in a live video environment with 10 peers. It's as close to the real thing as it gets.",
                color: "text-blue-500",
                bg: "bg-blue-500/10",
                border: "border-blue-500/20"
              },
              {
                icon: Star,
                title: "Industry Validation",
                desc: "Get rated by Product Managers, HRs, and Tech Leads from top companies. Feedback that actually counts.",
                color: "text-yellow-500",
                bg: "bg-yellow-500/10",
                border: "border-yellow-500/20"
              },
              {
                icon: Trophy,
                title: "Quantifiable Growth",
                desc: "Track your 'Employability Score'. See your confidence XP grow with every session you conquer.",
                color: "text-teal-500",
                bg: "bg-teal-500/10",
                border: "border-teal-500/20"
              }
            ].map((feature, i) => (
              <div key={i} className={`p-8 rounded-3xl bg-card/30 border ${feature.border} backdrop-blur-sm hover:transform hover:-translate-y-2 transition-all duration-300 group shadow-lg dark:shadow-none`}>
                <div className={`w-16 h-16 rounded-2xl ${feature.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`w-8 h-8 ${feature.color}`} />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- HALL OF FAME (Dynamic Experts) --- */}
      <section className="relative z-10 py-32 px-6 bg-card/20 border-y border-border/40">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">Mentored by the Best</h2>
              <p className="text-muted-foreground text-lg">Sessions conducted by professionals from top tier companies.</p>
            </div>
            <Link to="/auth">
              <Button variant="link" className="text-primary hover:text-primary/80 p-0 text-lg">View all mentors <ChevronRight className="ml-1 w-5 h-5" /></Button>
            </Link>
          </div>
          
          {experts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {experts.map((expert) => (
                <div key={expert.id} className="group relative overflow-hidden rounded-2xl p-8 bg-muted/20 border border-border/50 hover:bg-muted/40 hover:border-primary/30 transition-all duration-300">
                  <div className="flex flex-col h-full items-start justify-between">
                    <div className="w-full">
                      {/* Avatar Initials Circle */}
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 text-primary font-bold text-xl group-hover:scale-110 transition-transform shadow-inner">
                        {expert.name.charAt(0)}
                      </div>
                      <p className="text-foreground font-bold text-xl leading-tight mb-2 group-hover:text-primary transition-colors">{expert.name}</p>
                      <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider">{expert.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-16 border-2 border-dashed border-border rounded-3xl bg-card/50">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">Our expert panel is being curated. Join now to meet them live!</p>
            </div>
          )}
        </div>
      </section>

      {/* --- TESTIMONIALS --- */}
      <section className="relative z-10 py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">Student Stories</h2>
            <p className="text-muted-foreground text-lg">Real impact from real users.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                text: "I always froze during GDs. After 5 sessions on PrepLyt, I not only spoke but led the discussion in my actual placement drive. Got placed at TCS!",
                name: "Rahul S.",
                role: "Engineering Student, Pune",
                bg: "bg-gradient-to-br from-purple-500/10 to-blue-500/10"
              },
              {
                text: "The feedback from the Amazon mentor was eye-opening. He told me exactly why I was getting rejected. Fixed it, and now I'm hired.",
                name: "Priya M.",
                role: "MBA Graduate, Indore",
                bg: "bg-gradient-to-br from-teal-500/10 to-emerald-500/10"
              }
            ].map((item, i) => (
              <div key={i} className={`p-10 rounded-3xl border border-border/50 ${item.bg} backdrop-blur-sm relative bg-card/30`}>
                <Quote className="absolute top-8 right-8 w-12 h-12 text-foreground/5" />
                <p className="text-xl text-foreground leading-relaxed mb-8 relative z-10">"{item.text}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-bold text-foreground border border-border">
                    {item.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FINAL CTA --- */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto text-center relative">
          <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full mix-blend-screen pointer-events-none"></div>
          
          <div className="relative bg-gradient-to-br from-card to-background border border-border/50 p-12 md:p-20 rounded-[3rem] shadow-2xl overflow-hidden">
            {/* Decoration */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/20 rounded-full blur-3xl"></div>
            
            <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-8">Ready to master the boardroom?</h2>
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              Join thousands of students who are improving their communication skills every single day.
            </p>
            <Link to="/auth?mode=signup">
              <Button size="lg" className="h-16 px-12 text-xl font-bold rounded-full shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                Get Started for Free <PlayCircle className="ml-3 h-6 w-6" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="relative z-10 py-12 border-t border-border/40 bg-background text-center transition-colors duration-300">
        <div className="flex items-center justify-center gap-3 mb-6 opacity-80 hover:opacity-100 transition-opacity">
          <img src={logo} alt="Logo" className="h-8 w-auto grayscale hover:grayscale-0 transition-all" />
          <span className="font-bold text-xl text-foreground">PrepLyt</span>
        </div>
        <p className="text-muted-foreground text-sm">© 2024 PrepLyt. Empowering Tier 2/3 Talent.</p>
      </footer>
    </div>
  );
}