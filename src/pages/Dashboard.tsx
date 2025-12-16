import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CreateSessionModal } from '@/components/CreateSessionModal';
import { Input } from '@/components/ui/input';
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
  Circle, 
  Shield, 
  Briefcase, 
  GraduationCap, 
  Settings, 
  StopCircle, 
  RefreshCcw,
  UserPlus,
  Trash2,
  Upload
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

interface FeaturedExpert {
  id: string;
  name: string;
  role: string;
  image_url: string;
}

export default function Dashboard() {
  const { profile: contextProfile, user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Local profile state
  const [dashboardProfile, setDashboardProfile] = useState<any>(null);
  
  const [activeRooms, setActiveRooms] = useState<Room[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isJoining, setIsJoining] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [setupStatus, setSetupStatus] = useState("Initializing...");

  // Admin: Expert Management State
  const [expertName, setExpertName] = useState("");
  const [expertRole, setExpertRole] = useState("");
  const [expertImageFile, setExpertImageFile] = useState<File | null>(null);
  const [isAddingExpert, setIsAddingExpert] = useState(false);
  const [expertList, setExpertList] = useState<FeaturedExpert[]>([]);

  // Sync Context
  useEffect(() => {
    if (contextProfile) setDashboardProfile(contextProfile);
  }, [contextProfile]);

  // Auth Redirect
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Self-Healing Profile
  useEffect(() => {
    const initializeProfile = async () => {
      if (!loading && user && !dashboardProfile) {
        setSetupStatus("Checking profile data...");
        try {
          const { data: existing } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
          if (existing) {
            setDashboardProfile(existing);
            return;
          }
          setSetupStatus("Creating your profile...");
          const newProfile = {
            id: user.id,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
            role: 'student',
            points: 50
          };
          const { error: insertErr } = await supabase.from('profiles').insert(newProfile);
          if (!insertErr || insertErr.code === '23505') {
             const { data: retry } = await supabase.from('profiles').select('*').eq('id', user.id).single();
             if (retry) setDashboardProfile(retry);
          }
        } catch (err) {
          console.error(err);
        }
      }
    };
    initializeProfile();
  }, [user, dashboardProfile, loading]);

  // Fetch Rooms & Experts
  useEffect(() => {
    if (dashboardProfile) {
      fetchActiveRooms();
      fetchExperts(); 

      const channel = supabase.channel('rooms-list')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => fetchActiveRooms())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [dashboardProfile]);

  const fetchActiveRooms = async () => {
    setIsLoadingRooms(true);
    const { data } = await supabase
      .from('rooms')
      .select('*')
      .in('status', ['waiting', 'live'])
      .order('created_at', { ascending: false });

    if (data) {
      const hostIds = [...new Set(data.map(r => r.host_id).filter(Boolean))];
      const { data: hosts } = await supabase.from('profiles').select('id, name').in('id', hostIds);
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

  const fetchExperts = async () => {
    const { data } = await supabase.from('featured_experts' as any).select('*');
    if (data) setExpertList(data as FeaturedExpert[]);
  };

  const getLevel = (points: number) => {
    if (points < 100) return { level: 1, title: 'Novice', next: 100 };
    if (points < 300) return { level: 2, title: 'Apprentice', next: 300 };
    if (points < 600) return { level: 3, title: 'Intermediate', next: 600 };
    if (points < 1000) return { level: 4, title: 'Advanced', next: 1000 };
    return { level: 5, title: 'Master', next: points };
  };

  const handleJoinRoom = async (roomId: string) => {
    if (!dashboardProfile) return;
    setIsJoining(roomId);
    try {
      if (dashboardProfile.role === 'student') {
        const { data: room } = await supabase.from('rooms').select('*').eq('id', roomId).single();
        if (room) {
          const participants = (room.participants as { id: string; name: string; role: string }[]) || [];
          if (!participants.find(p => p.id === dashboardProfile.id)) {
            const updatedParticipants = [...participants, { id: dashboardProfile.id, name: dashboardProfile.name, role: dashboardProfile.role }];
            await supabase.from('rooms').update({ participants: updatedParticipants }).eq('id', roomId);
          }
        }
      }
      navigate(`/room/${roomId}`);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to join.', variant: 'destructive' });
    } finally {
      setIsJoining(null);
    }
  };

  const handleEndSession = async (roomId: string) => {
    if (!confirm("Are you sure you want to end this session?")) return;
    try {
      await supabase.from('rooms').update({ status: 'completed' }).eq('id', roomId);
      toast({ title: "Session Ended", description: "Session moved to history." });
      fetchActiveRooms();
    } catch (error) {
      toast({ title: "Error", description: "Could not end session", variant: "destructive" });
    }
  };

  const handleCreateSession = async (data: { domain: string; topic: string; meetingLink: string }) => {
    if (!dashboardProfile) return;
    const { error } = await supabase.from('rooms').insert({
      topic: data.topic,
      domain: data.domain,
      meeting_link: data.meetingLink,
      status: 'waiting',
      participants: [],
      host_id: dashboardProfile.id
    });
    if (error) throw error;
    toast({ title: 'Session created', description: 'Experts and students can now join.' });
    setShowCreateModal(false);
    fetchActiveRooms();
  };

  // ADMIN: Add Featured Expert (Updated with Image Upload)
  const handleAddExpert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expertName || !expertRole) {
      toast({ title: "Missing Info", description: "Name and Role are required", variant: "destructive" });
      return;
    }
    
    setIsAddingExpert(true);
    let imageUrl = "https://api.dicebear.com/7.x/avataaars/svg?seed=" + expertName;

    try {
      // 1. Upload Image if provided
      if (expertImageFile) {
        const fileExt = expertImageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('expert-images')
          .upload(fileName, expertImageFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('expert-images')
          .getPublicUrl(fileName);
          
        imageUrl = publicUrlData.publicUrl;
      }

      // 2. Save Expert Data
      const { error } = await supabase.from('featured_experts' as any).insert({
        name: expertName,
        role: expertRole,
        image_url: imageUrl
      });

      if (error) throw error;
      
      toast({ title: "Success", description: "Expert added to Home Page" });
      setExpertName("");
      setExpertRole("");
      setExpertImageFile(null);
      fetchExperts(); 
    } catch (error: any) {
      console.error(error);
      toast({ title: "Error", description: error.message || "Failed to add expert", variant: "destructive" });
    } finally {
      setIsAddingExpert(false);
    }
  };

  // ADMIN: Remove Expert
  const handleRemoveExpert = async (id: string) => {
    if(!confirm("Remove this expert from the home page?")) return;
    
    try {
      const { error } = await supabase.from('featured_experts' as any).delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Removed", description: "Expert removed successfully" });
      fetchExperts();
    } catch(error) {
      toast({ title: "Error", description: "Could not remove expert", variant: "destructive" });
    }
  };

  const handleSignOut = async () => { await signOut(); navigate('/'); };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (user && !dashboardProfile) return <div className="min-h-screen flex items-center justify-center bg-background"><p>{setupStatus}</p></div>;
  if (!dashboardProfile) return null;

  const levelInfo = getLevel(dashboardProfile.points);
  const progress = (dashboardProfile.points / levelInfo.next) * 100;
  const isAdmin = dashboardProfile.role === 'admin';
  const isExpert = dashboardProfile.role === 'expert';
  const isStudent = dashboardProfile.role === 'student';

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <header className="border-b border-border/40 bg-card/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <MessageSquare className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight">GD Master</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:inline">Welcome, <span className="font-medium text-foreground">{dashboardProfile.name}</span></span>
              <Button variant="ghost" size="icon" onClick={handleSignOut} className="hover:bg-destructive/10 hover:text-destructive"><LogOut className="h-5 w-5" /></Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* ADMIN PANELS */}
        {isAdmin && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* 1. Session Manager */}
            <div className="p-6 bg-gradient-to-br from-green-500/5 to-green-500/10 border border-green-500/20 rounded-xl h-fit backdrop-blur-md shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center shadow-inner">
                  <Settings className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Session Control</h2>
                  <p className="text-sm text-muted-foreground">Schedule new live sessions</p>
                </div>
              </div>
              <Button onClick={() => setShowCreateModal(true)} className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20">
                <Plus className="mr-2 h-4 w-4" /> Create Session
              </Button>
            </div>

            {/* 2. Content Manager (Glass Effect) */}
            <div className="p-6 bg-card/40 backdrop-blur-md border border-border/60 rounded-xl shadow-sm hover:border-primary/30 transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shadow-inner">
                  <UserPlus className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Website Content</h2>
                  <p className="text-sm text-muted-foreground">Manage Featured Experts</p>
                </div>
              </div>
              
              <form onSubmit={handleAddExpert} className="space-y-3 mb-6">
                <Input placeholder="Expert Name" value={expertName} onChange={e => setExpertName(e.target.value)} className="bg-background/50 border-border/50 focus:border-primary/50 transition-colors" />
                <Input placeholder="Role (e.g. PM at Google)" value={expertRole} onChange={e => setExpertRole(e.target.value)} className="bg-background/50 border-border/50 focus:border-primary/50 transition-colors" />
                
                <div className="flex items-center gap-2">
                  <Input 
                    type="file" 
                    accept="image/*" 
                    className="cursor-pointer text-xs bg-background/50 border-border/50 file:text-foreground"
                    onChange={(e) => setExpertImageFile(e.target.files ? e.target.files[0] : null)} 
                  />
                  <Button type="submit" disabled={isAddingExpert} size="icon" className="shrink-0 shadow-md">
                    {isAddingExpert ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Upload photo or use default avatar</p>
              </form>

              {/* Expert List */}
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                {expertList.map(expert => (
                  <div key={expert.id} className="flex items-center justify-between p-2 bg-background/40 border border-border/30 rounded-lg text-sm hover:bg-background/60 transition-colors">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <img src={expert.image_url} alt="" className="w-6 h-6 rounded-full object-cover bg-muted border border-border" />
                      <span className="truncate font-medium">{expert.name}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveExpert(expert.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* EXPERT HEADER */}
        {isExpert && (
          <div className="p-6 bg-gradient-to-r from-amber-500/5 to-amber-500/10 border border-amber-500/20 rounded-xl backdrop-blur-md shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center shadow-inner">
                <Briefcase className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Moderator Dashboard</h2>
                <p className="text-sm text-muted-foreground">Select a session below to evaluate candidates</p>
              </div>
            </div>
          </div>
        )}

        {/* STUDENT STATS */}
        {isStudent && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-card/40 border border-border/50 backdrop-blur-md hover:bg-card/60 hover:border-primary/30 transition-all duration-300 shadow-sm group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm"><Trophy className="w-5 h-5 text-primary" /></div>
                <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Level</p><p className="text-2xl font-bold">{levelInfo.level}</p></div>
              </div>
              <p className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-md w-fit">{levelInfo.title}</p>
            </div>

            <div className="p-5 rounded-2xl bg-card/40 border border-border/50 backdrop-blur-md hover:bg-card/60 hover:border-green-500/30 transition-all duration-300 shadow-sm group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm"><Zap className="w-5 h-5 text-green-500" /></div>
                <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">XP</p><p className="text-2xl font-bold">{dashboardProfile.points}</p></div>
              </div>
              <div className="w-full bg-muted/50 rounded-full h-1.5 overflow-hidden">
                <div className="bg-green-500 h-1.5 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(34,197,94,0.4)]" style={{ width: `${Math.min(progress, 100)}%` }}></div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card/40 border border-border/50 backdrop-blur-md hover:bg-card/60 hover:border-amber-500/30 transition-all duration-300 shadow-sm group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm"><Star className="w-5 h-5 text-amber-500" /></div>
                <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rating</p><p className="text-2xl font-bold">--</p></div>
              </div>
              <p className="text-xs text-muted-foreground">Complete a session</p>
            </div>

            <div className="p-5 rounded-2xl bg-card/40 border border-border/50 backdrop-blur-md hover:bg-card/60 hover:border-blue-500/30 transition-all duration-300 shadow-sm group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm"><Users className="w-5 h-5 text-blue-500" /></div>
                <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sessions</p><p className="text-2xl font-bold">0</p></div>
              </div>
              <p className="text-xs text-muted-foreground">Join your first!</p>
            </div>
          </div>
        )}

        {/* ACTIVE SESSIONS LIST */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              {isAdmin ? 'All Sessions' : isExpert ? 'Available Sessions' : 'Upcoming Sessions'}
            </h2>
            <Button variant="outline" size="sm" onClick={fetchActiveRooms} className="hover:bg-primary/5 hover:border-primary/30">Refresh</Button>
          </div>

          {isLoadingRooms ? (
            <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
          ) : activeRooms.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {activeRooms.map((room) => (
                <div key={room.id} className="bg-card/40 border border-border/60 rounded-2xl p-6 hover:shadow-xl hover:border-primary/30 transition-all duration-300 group backdrop-blur-md relative overflow-hidden">
                  {/* Subtle gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  
                  <div className="flex flex-col h-full justify-between gap-5 relative z-10">
                    <div className="flex-1">
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${room.status === 'live' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                          <Circle className={`w-1.5 h-1.5 ${room.status === 'live' ? 'fill-green-500 text-green-500 animate-pulse' : 'fill-amber-500 text-amber-500'}`} />
                          {room.status === 'live' ? 'Live Now' : 'Waiting'}
                        </div>
                        <span className="text-xs font-bold text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-full border border-border/50 capitalize">{room.domain}</span>
                      </div>
                      
                      <h3 className="text-lg font-bold mb-2 line-clamp-2 leading-tight group-hover:text-primary transition-colors">{room.topic}</h3>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
                        <span className="flex items-center gap-1.5 font-medium bg-background/50 px-2 py-1 rounded-md border border-border/50">
                          <Users className="w-3.5 h-3.5 text-primary/70" /> 
                          {room.participants.length} participants
                        </span>
                      </div>
                      
                      {room.meeting_link && (
                        <div className="flex items-center gap-1.5 mt-3 text-xs font-medium text-primary bg-primary/5 w-fit px-2.5 py-1.5 rounded-md border border-primary/10">
                          <ExternalLink className="w-3 h-3" />
                          <span>Video enabled</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 pt-4 border-t border-border/40">
                      {isAdmin && (
                        <Button variant="destructive" size="sm" onClick={() => handleEndSession(room.id)} title="End Session" className="w-10 px-0 shadow-sm hover:shadow-md">
                          <StopCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button onClick={() => handleJoinRoom(room.id)} disabled={isJoining === room.id} className="w-full shadow-md hover:shadow-lg hover:bg-primary/90 transition-all font-bold">
                        {isJoining === room.id ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                          <>{isExpert ? 'Moderate' : isAdmin ? 'View' : 'Join'} <ChevronRight className="ml-1 h-4 w-4" /></>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card/20 border border-border/40 border-dashed rounded-2xl p-16 text-center backdrop-blur-sm">
              <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-xl font-medium text-foreground">No active sessions</p>
              <p className="text-sm text-muted-foreground mt-2">Check back later for new discussions.</p>
            </div>
          )}
        </section>
      </main>

      {isAdmin && <CreateSessionModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSubmit={handleCreateSession} />}
    </div>
  );
}