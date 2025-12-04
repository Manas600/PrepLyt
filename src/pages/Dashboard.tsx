import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  LogOut, 
  Trophy, 
  Zap, 
  Star, 
  TrendingUp,
  Users,
  Video,
  Calendar,
  ChevronRight,
  Loader2,
  MessageSquare,
  Briefcase,
  PieChart,
  Laptop
} from 'lucide-react';

interface Room {
  id: string;
  topic: string;
  domain: string;
  status: string;
  participants: { id: string; name: string; role: string }[];
  created_at: string;
}

const DOMAINS = [
  {
    id: 'marketing',
    name: 'Marketing',
    icon: TrendingUp,
    color: 'from-pink-500 to-rose-500',
    bgColor: 'bg-pink-500/10',
    topics: ['AI in Digital Marketing', 'Social Media Strategy 2024', 'Brand Building in Gen-Z Era']
  },
  {
    id: 'tech',
    name: 'Technology',
    icon: Laptop,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-500/10',
    topics: ['Future of AI', 'Cloud Computing Trends', 'Cybersecurity Challenges']
  },
  {
    id: 'finance',
    name: 'Finance',
    icon: PieChart,
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-500/10',
    topics: ['Cryptocurrency Adoption', 'Sustainable Investing', 'FinTech Revolution']
  },
  {
    id: 'business',
    name: 'Business',
    icon: Briefcase,
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-500/10',
    topics: ['Remote Work Culture', 'Startup Ecosystem', 'Global Supply Chain']
  }
];

export default function Dashboard() {
  const { profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [upcomingSessions, setUpcomingSessions] = useState<Room[]>([]);
  const [isJoining, setIsJoining] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !profile) {
      navigate('/auth');
    }
  }, [profile, loading, navigate]);

  useEffect(() => {
    if (profile?.role === 'expert') {
      fetchUpcomingSessions();
    }
  }, [profile]);

  const fetchUpcomingSessions = async () => {
    const { data } = await supabase
      .from('rooms')
      .select('*')
      .in('status', ['waiting', 'live'])
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) {
      setUpcomingSessions(data as unknown as Room[]);
    }
  };

  const getLevel = (points: number) => {
    if (points < 100) return { level: 1, title: 'Novice', next: 100 };
    if (points < 300) return { level: 2, title: 'Apprentice', next: 300 };
    if (points < 600) return { level: 3, title: 'Intermediate', next: 600 };
    if (points < 1000) return { level: 4, title: 'Advanced', next: 1000 };
    return { level: 5, title: 'Master', next: points };
  };

  const handleJoinDomain = async (domain: typeof DOMAINS[0]) => {
    if (!profile) return;
    
    setIsJoining(domain.id);

    try {
      // Check for existing waiting room in this domain
      const { data: existingRoom } = await supabase
        .from('rooms')
        .select('*')
        .eq('domain', domain.id)
        .eq('status', 'waiting')
        .maybeSingle();

      let roomId: string;

      if (existingRoom) {
        // Join existing room
        roomId = existingRoom.id;
        const participants = existingRoom.participants as { id: string; name: string; role: string }[] || [];
        
        // Check if already in room
        if (!participants.find(p => p.id === profile.id)) {
          const updatedParticipants = [
            ...participants,
            { id: profile.id, name: profile.name, role: profile.role }
          ];

          await supabase
            .from('rooms')
            .update({ participants: updatedParticipants })
            .eq('id', roomId);
        }
      } else {
        // Create new room
        const randomTopic = domain.topics[Math.floor(Math.random() * domain.topics.length)];
        
        const { data: newRoom, error } = await supabase
          .from('rooms')
          .insert({
            topic: randomTopic,
            domain: domain.id,
            status: 'waiting',
            participants: [{ id: profile.id, name: profile.name, role: profile.role }],
            host_id: profile.id
          })
          .select()
          .single();

        if (error) throw error;
        roomId = newRoom.id;
      }

      navigate(`/room/${roomId}`);
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        title: 'Error',
        description: 'Failed to join the discussion. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsJoining(null);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    if (!profile) return;
    
    setIsJoining(roomId);

    try {
      const { data: room } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (room) {
        const participants = room.participants as { id: string; name: string; role: string }[] || [];
        
        if (!participants.find(p => p.id === profile.id)) {
          const updatedParticipants = [
            ...participants,
            { id: profile.id, name: profile.name, role: profile.role }
          ];

          await supabase
            .from('rooms')
            .update({ participants: updatedParticipants })
            .eq('id', roomId);
        }
      }

      navigate(`/room/${roomId}`);
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        title: 'Error',
        description: 'Failed to join the session.',
        variant: 'destructive'
      });
    } finally {
      setIsJoining(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const levelInfo = getLevel(profile.points);
  const progress = (profile.points / levelInfo.next) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">GD Master</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Welcome,</span>
                <span className="font-medium text-foreground">{profile.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  profile.role === 'expert' 
                    ? 'bg-warning/20 text-warning' 
                    : 'bg-primary/20 text-primary'
                }`}>
                  {profile.role === 'expert' ? 'Expert' : 'Student'}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Section */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-slide-up">
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Level</p>
                <p className="text-xl font-bold text-foreground">{levelInfo.level}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{levelInfo.title}</p>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">XP Points</p>
                <p className="text-xl font-bold text-foreground">{profile.points}</p>
              </div>
            </div>
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-success rounded-full transition-all duration-500"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-star/10 flex items-center justify-center">
                <Star className="w-5 h-5 text-star" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Rating</p>
                <p className="text-xl font-bold text-foreground">--</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Complete a session</p>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <Users className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sessions</p>
                <p className="text-xl font-bold text-foreground">0</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Join your first!</p>
          </div>
        </div>

        {/* Expert View - Upcoming Sessions */}
        {profile.role === 'expert' && (
          <section className="mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Sessions to Moderate
              </h2>
              <Button variant="ghost" size="sm" onClick={fetchUpcomingSessions}>
                Refresh
              </Button>
            </div>
            
            {upcomingSessions.length > 0 ? (
              <div className="space-y-3">
                {upcomingSessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-card border border-border rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        session.status === 'live' ? 'bg-success/20' : 'bg-muted'
                      }`}>
                        <Video className={`w-6 h-6 ${
                          session.status === 'live' ? 'text-success' : 'text-muted-foreground'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{session.topic}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="capitalize">{session.domain}</span>
                          <span>•</span>
                          <span>{(session.participants as unknown[])?.length || 0} participants</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            session.status === 'live' 
                              ? 'bg-success/20 text-success' 
                              : 'bg-warning/20 text-warning'
                          }`}>
                            {session.status === 'live' ? 'Live' : 'Waiting'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleJoinRoom(session.id)}
                      disabled={isJoining === session.id}
                    >
                      {isJoining === session.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Join <ChevronRight className="ml-1 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <Video className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No active sessions at the moment</p>
                <p className="text-sm text-muted-foreground mt-1">Sessions will appear here when students start discussions</p>
              </div>
            )}
          </section>
        )}

        {/* Domain Selection */}
        <section className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            {profile.role === 'student' ? 'Join a Discussion' : 'Browse Domains'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {DOMAINS.map((domain) => (
              <button
                key={domain.id}
                onClick={() => handleJoinDomain(domain)}
                disabled={isJoining === domain.id}
                className="domain-card bg-card border border-border text-left group"
              >
                <div className={`w-14 h-14 rounded-xl ${domain.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <domain.icon className={`w-7 h-7 bg-gradient-to-r ${domain.color} bg-clip-text`} style={{ color: 'transparent', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }} />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">{domain.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {domain.topics[0]}
                </p>
                <div className="flex items-center text-primary text-sm font-medium">
                  {isJoining === domain.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      Join now <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
