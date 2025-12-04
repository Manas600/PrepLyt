import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  Users, 
  Star, 
  Video, 
  ChevronRight, 
  Zap,
  Trophy,
  ArrowRight,
  Loader2
} from 'lucide-react';

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Gradient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-accent/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">GD Master</span>
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
      <section className="relative z-10 pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 animate-fade-in">
            <Zap className="w-4 h-4" />
            <span>Practice GDs with real-time expert feedback</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 animate-slide-up">
            Master the Art of{' '}
            <span className="gradient-text">Group Discussions</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Join live video discussions with peers, get rated by industry experts, 
            and level up your communication skills through gamified learning.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Link to="/auth">
              <Button size="lg" className="h-14 px-8 text-lg glow-effect">
                Start Practicing
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg">
                Join as Expert
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 bg-card/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Everything you need to excel
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              A complete platform designed to help you master group discussions
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="group p-8 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Video className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Live Video Discussions</h3>
              <p className="text-muted-foreground">
                Join real-time video calls with peers from around the world. Practice on topics across Marketing, Tech, Finance, and more.
              </p>
            </div>

            <div className="group p-8 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="w-14 h-14 rounded-xl bg-star/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Star className="w-7 h-7 text-star" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Expert Ratings</h3>
              <p className="text-muted-foreground">
                Get real-time feedback from industry experts who rate your performance and provide actionable insights.
              </p>
            </div>

            <div className="group p-8 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="w-14 h-14 rounded-xl bg-success/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Trophy className="w-7 h-7 text-success" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Gamified Learning</h3>
              <p className="text-muted-foreground">
                Earn XP points, level up your profile, and track your progress as you improve your discussion skills.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              How it works
            </h2>
            <p className="text-muted-foreground text-lg">
              Get started in three simple steps
            </p>
          </div>

          <div className="space-y-8">
            {[
              {
                step: '01',
                title: 'Choose your domain',
                description: 'Select from Marketing, Technology, Finance, or Business topics that interest you.'
              },
              {
                step: '02',
                title: 'Join a live discussion',
                description: 'Get matched with other students and join a video call with an auto-generated topic.'
              },
              {
                step: '03',
                title: 'Get rated & improve',
                description: 'Receive instant feedback from experts, earn XP points, and track your progress.'
              }
            ].map((item, index) => (
              <div 
                key={item.step}
                className="flex items-start gap-6 animate-slide-up"
                style={{ animationDelay: `${0.1 * (index + 1)}s` }}
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold">{item.step}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 rounded-3xl bg-gradient-to-br from-primary/10 via-card to-accent/10 border border-border">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Ready to master GDs?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Join thousands of students who are improving their communication skills every day.
            </p>
            <Link to="/auth">
              <Button size="lg" className="h-14 px-8 text-lg glow-effect">
                Get Started for Free
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">GD Master</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 GD Master. Built for students, by students.
          </p>
        </div>
      </footer>
    </div>
  );
}
