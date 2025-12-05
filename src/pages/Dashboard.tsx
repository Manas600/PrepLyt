import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CreateSessionModal } from '@/components/CreateSessionModal';
import { 
  LogOut, 
  Trophy, 
  Zap, 
  Star, 
  Users,
  Calendar,
  ChevronRight,
  Loader2,
  MessageSquare,
  Plus,
  ExternalLink,
  Circle
} from 'lucide-react';

interface Room {
  id: string;
  topic: string;
  domain: string;
  status: string;
  meeting_link: string | null;
  participants: { id: string; name: string; role: string }[];
  host_id: string;
  created_at: string;
  host?: { name: string };
}

export default function Dashboard() {
  const { profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeRooms, setActiveRooms] = useState<Room[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isJoining, setIsJoining] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!loading && !profile) {
      navigate('/auth');
    }
  }, [profile, loading, navigate]);

  useEffect(() => {
    if (profile) {
      fetchActiveRooms();
      
      // Subscribe to realtime room updates
      const channel = supabase
        .channel('rooms-list')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'rooms' },
          () => fetchActiveRooms()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile]);

  const fetchActiveRooms = async () => {
    setIsLoadingRooms(true);
    const { data } = await supabase
      .from('rooms')
      .select('*')
      .in('status', ['waiting', 'live'])
      .order('created_at', { ascending: false });

    if (data) {
      // Fetch host names
      const hostIds = [...new Set(data.map(r => r.host_id).filter(Boolean))];
      const { data: hosts } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', hostIds);

      const hostsMap = new Map(hosts?.map(h => [h.id, h.name]) || []);
      
      const roomsWithHosts = data.map(room => ({
        ...room,
        participants: (room.participants as { id: string; name: string; role: string }[]) || [],
        host: room.host_id ? { name: hostsMap.get(room.host_id) || 'Unknown' } : undefined
      }));
      
      setActiveRooms(roomsWithHosts);
    }
    setIsLoadingRooms(false);
  };

  const getLevel = (points: number) => {
    if (points < 100) return { level: 1, title: 'Novice', next: 100 };
    if (points < 300) return { level: 2, title: 'Apprentice', next: 300 };
    if (points < 600) return { level: 3, title: 'Intermediate', next: 600 };
    if (points < 1000) return { level: 4, title: 'Advanced', next: 1000 };
    return { level: 5, title: 'Master', next: points };
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
        const participants = (room.participants as { id: string; name: string; role: string }[]) || [];
        
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

  const handleCreateSession = async (data: { domain: string; topic: string; meetingLink: string }) => {
    if (!profile) return;

    const { data: newRoom, error } = await supabase
      .from('rooms')
      .insert({
        topic: data.topic,
        domain: data.domain,
        meeting_link: data.meetingLink,
        status: 'waiting',
        participants: [{ id: profile.id, name: profile.name, role: profile.role }],
        host_id: profile.id
      })
      .select()
      .single();

    if (error) throw error;

    toast({
      title: 'Session created',
      description: 'Your session is now live. Students can join.'
    });

    navigate(`/room/${newRoom.id}`);
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
  const isExpert = profile.role === 'expert';

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
                  isExpert 
                    ? 'bg-warning/20 text-warning' 
                    : 'bg-primary/20 text-primary'
                }`}>
                  {isExpert ? 'Expert' : 'Student'}
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

        {/* Expert: Create Session Button */}
        {isExpert && (
          <div className="mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <Button 
              size="lg" 
              onClick={() => setShowCreateModal(true)}
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 h-5 w-5" />
              Create New Session
            </Button>
          </div>
        )}

        {/* Active Sessions */}
        <section className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              {isExpert ? 'Active Sessions' : 'Available Sessions'}
            </h2>
            <Button variant="ghost" size="sm" onClick={fetchActiveRooms}>
              Refresh
            </Button>
          </div>

          {isLoadingRooms ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : activeRooms.length > 0 ? (
            <div className="grid gap-4">
              {activeRooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Circle className={`w-2.5 h-2.5 ${
                          room.status === 'live' ? 'fill-success text-success' : 'fill-warning text-warning'
                        }`} />
                        <span className={`text-xs font-medium ${
                          room.status === 'live' ? 'text-success' : 'text-warning'
                        }`}>
                          {room.status === 'live' ? 'Live Now' : 'Waiting'}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground capitalize">{room.domain}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">{room.topic}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {room.host && (
                          <span>Hosted by <span className="text-foreground font-medium">{room.host.name}</span></span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {room.participants.length} joined
                        </span>
                      </div>
                      {room.meeting_link && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <ExternalLink className="w-3 h-3" />
                          <span>External video call available</span>
                        </div>
                      )}
                    </div>
                    <Button 
                      onClick={() => handleJoinRoom(room.id)}
                      disabled={isJoining === room.id}
                    >
                      {isJoining === room.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Join <ChevronRight className="ml-1 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-medium text-foreground mb-1">No active sessions</p>
              <p className="text-sm text-muted-foreground">
                {isExpert 
                  ? 'Create a new session to get started'
                  : 'Check back soon or ask an expert to create a session'}
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Create Session Modal */}
      <CreateSessionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateSession}
      />
    </div>
  );
}
