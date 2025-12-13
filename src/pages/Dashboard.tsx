import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CreateSessionModal } from "@/components/CreateSessionModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Upload,
} from "lucide-react";

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
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Self-Healing Profile
  useEffect(() => {
    const initializeProfile = async () => {
      if (!loading && user && !dashboardProfile) {
        setSetupStatus("Checking profile data...");
        try {
          const { data: existing } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();
          if (existing) {
            setDashboardProfile(existing);
            return;
          }
          setSetupStatus("Creating your profile...");
          const newProfile = {
            id: user.id,
            name:
              user.user_metadata?.name || user.email?.split("@")[0] || "User",
            role: "student",
            points: 50,
          };
          const { error: insertErr } = await supabase
            .from("profiles")
            .insert(newProfile);
          if (!insertErr || insertErr.code === "23505") {
            const { data: retry } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", user.id)
              .single();
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
      fetchExperts(); // Fetch list for admin management

      const channel = supabase
        .channel("rooms-list")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "rooms" },
          () => fetchActiveRooms()
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [dashboardProfile]);

  const fetchActiveRooms = async () => {
    setIsLoadingRooms(true);
    const { data } = await supabase
      .from("rooms")
      .select("*")
      .in("status", ["waiting", "live"])
      .order("created_at", { ascending: false });

    if (data) {
      const hostIds = [...new Set(data.map((r) => r.host_id).filter(Boolean))];
      const { data: hosts } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", hostIds);
      const hostsMap = new Map(hosts?.map((h) => [h.id, h.name]) || []);

      const roomsWithHosts = data.map((room) => ({
        ...room,
        participants:
          (room.participants as { id: string; name: string; role: string }[]) ||
          [],
        host: room.host_id
          ? { name: hostsMap.get(room.host_id) || "Unknown" }
          : undefined,
      }));
      setActiveRooms(roomsWithHosts);
    }
    setIsLoadingRooms(false);
  };

  const fetchExperts = async () => {
    const { data } = await supabase.from("featured_experts" as any).select("*");
    if (data) setExpertList(data as FeaturedExpert[]);
  };

  const getLevel = (points: number) => {
    if (points < 100) return { level: 1, title: "Novice", next: 100 };
    if (points < 300) return { level: 2, title: "Apprentice", next: 300 };
    if (points < 600) return { level: 3, title: "Intermediate", next: 600 };
    if (points < 1000) return { level: 4, title: "Advanced", next: 1000 };
    return { level: 5, title: "Master", next: points };
  };

  const handleJoinRoom = async (roomId: string) => {
    if (!dashboardProfile) return;
    setIsJoining(roomId);
    try {
      if (dashboardProfile.role === "student") {
        const { data: room } = await supabase
          .from("rooms")
          .select("*")
          .eq("id", roomId)
          .single();
        if (room) {
          const participants =
            (room.participants as {
              id: string;
              name: string;
              role: string;
            }[]) || [];
          if (!participants.find((p) => p.id === dashboardProfile.id)) {
            const updatedParticipants = [
              ...participants,
              {
                id: dashboardProfile.id,
                name: dashboardProfile.name,
                role: dashboardProfile.role,
              },
            ];
            await supabase
              .from("rooms")
              .update({ participants: updatedParticipants })
              .eq("id", roomId);
          }
        }
      }
      navigate(`/room/${roomId}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to join.",
        variant: "destructive",
      });
    } finally {
      setIsJoining(null);
    }
  };

  const handleEndSession = async (roomId: string) => {
    if (!confirm("Are you sure you want to end this session?")) return;
    try {
      await supabase
        .from("rooms")
        .update({ status: "completed" })
        .eq("id", roomId);
      toast({
        title: "Session Ended",
        description: "Session moved to history.",
      });
      fetchActiveRooms();
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not end session",
        variant: "destructive",
      });
    }
  };

  const handleCreateSession = async (data: {
    domain: string;
    topic: string;
    meetingLink: string;
  }) => {
    if (!dashboardProfile) return;
    const { error } = await supabase.from("rooms").insert({
      topic: data.topic,
      domain: data.domain,
      meeting_link: data.meetingLink,
      status: "waiting",
      participants: [],
      host_id: dashboardProfile.id,
    });
    if (error) throw error;
    toast({
      title: "Session created",
      description: "Experts and students can now join.",
    });
    setShowCreateModal(false);
    fetchActiveRooms();
  };

  // ADMIN: Add Featured Expert
  const handleAddExpert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expertName || !expertRole) {
      toast({
        title: "Missing Info",
        description: "Name and Role are required",
        variant: "destructive",
      });
      return;
    }

    setIsAddingExpert(true);
    let imageUrl =
      "https://api.dicebear.com/7.x/avataaars/svg?seed=" + expertName;

    try {
      // 1. Upload Image if provided
      if (expertImageFile) {
        const fileExt = expertImageFile.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("expert-images")
          .upload(fileName, expertImageFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("expert-images")
          .getPublicUrl(fileName);

        imageUrl = publicUrlData.publicUrl;
      }

      // 2. Save Expert Data
      const { error } = await supabase.from("featured_experts" as any).insert({
        name: expertName,
        role: expertRole,
        image_url: imageUrl,
      });

      if (error) throw error;

      toast({ title: "Success", description: "Expert added to Home Page" });
      setExpertName("");
      setExpertRole("");
      setExpertImageFile(null);
      fetchExperts(); // Refresh list
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Error",
        description: error.message || "Failed to add expert",
        variant: "destructive",
      });
    } finally {
      setIsAddingExpert(false);
    }
  };

  // ADMIN: Remove Expert
  const handleRemoveExpert = async (id: string) => {
    if (!confirm("Remove this expert from the home page?")) return;

    try {
      const { error } = await supabase
        .from("featured_experts" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Removed", description: "Expert removed successfully" });
      fetchExperts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not remove expert",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

  if (user && !dashboardProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 gap-6">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Loading your dashboard...
          </h2>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            {setupStatus}
          </p>
        </div>
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="gap-2"
          >
            <RefreshCcw className="w-4 h-4" /> Reload
          </Button>
          <Button variant="destructive" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  if (!dashboardProfile) return null;

  const levelInfo = getLevel(dashboardProfile.points);
  const progress = (dashboardProfile.points / levelInfo.next) * 100;
  const isAdmin = dashboardProfile.role === "admin";
  const isExpert = dashboardProfile.role === "expert";
  const isStudent = dashboardProfile.role === "student";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">
                GD Master
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Welcome,{" "}
                <span className="font-medium text-foreground">
                  {dashboardProfile.name}
                </span>
              </span>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ADMIN PANELS */}
        {isAdmin && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* 1. Session Manager */}
            <div className="p-6 bg-gradient-to-r from-success/10 to-success/5 border border-success/20 rounded-xl h-fit">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-success" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    Session Control
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Schedule new live sessions
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="w-full bg-success hover:bg-success/90"
              >
                <Plus className="mr-2 h-4 w-4" /> Create Session
              </Button>
            </div>

            {/* 2. Content Manager (UPDATED) */}
            <div className="p-6 bg-card border border-border rounded-xl">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    Website Content
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Manage Featured Experts
                  </p>
                </div>
              </div>

              <form onSubmit={handleAddExpert} className="space-y-3 mb-6">
                <Input
                  placeholder="Expert Name (e.g. John Doe)"
                  value={expertName}
                  onChange={(e) => setExpertName(e.target.value)}
                />
                <Input
                  placeholder="Role (e.g. PM at Google)"
                  value={expertRole}
                  onChange={(e) => setExpertRole(e.target.value)}
                />

                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    className="cursor-pointer text-xs"
                    onChange={(e) =>
                      setExpertImageFile(
                        e.target.files ? e.target.files[0] : null
                      )
                    }
                  />
                  <Button
                    type="submit"
                    disabled={isAddingExpert}
                    size="icon"
                    className="shrink-0"
                  >
                    {isAddingExpert ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload photo or use default avatar
                </p>
              </form>

              {/* Expert List */}
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                {expertList.map((expert) => (
                  <div
                    key={expert.id}
                    className="flex items-center justify-between p-2 bg-muted/30 rounded-lg text-sm"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <img
                        src={expert.image_url}
                        alt=""
                        className="w-6 h-6 rounded-full object-cover bg-slate-200"
                      />
                      <span className="truncate font-medium">
                        {expert.name}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:bg-destructive/10"
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
          <div className="p-6 bg-gradient-to-r from-warning/10 to-warning/5 border border-warning/20 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-warning" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Moderator Dashboard
                </h2>
                <p className="text-sm text-muted-foreground">
                  Select a session below to evaluate candidates
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STUDENT STATS */}
        {isStudent && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Level</p>
                  <p className="text-xl font-bold text-foreground">
                    {levelInfo.level}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {levelInfo.title}
              </p>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">XP Points</p>
                  <p className="text-xl font-bold text-foreground">
                    {dashboardProfile.points}
                  </p>
                </div>
              </div>
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-success rounded-full"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
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
              <p className="text-xs text-muted-foreground mt-2">Join now!</p>
            </div>
          </div>
        )}

        {/* ACTIVE SESSIONS LIST */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              {isAdmin
                ? "All Sessions"
                : isExpert
                ? "Available Sessions"
                : "Upcoming Sessions"}
            </h2>
            <Button variant="ghost" size="sm" onClick={fetchActiveRooms}>
              Refresh
            </Button>
          </div>

          {isLoadingRooms ? (
            <div className="flex justify-center py-12">
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
                        <Circle
                          className={`w-2.5 h-2.5 ${
                            room.status === "live"
                              ? "fill-success text-success"
                              : "fill-warning text-warning"
                          }`}
                        />
                        <span
                          className={`text-xs font-medium ${
                            room.status === "live"
                              ? "text-success"
                              : "text-warning"
                          }`}
                        >
                          {room.status === "live" ? "Live Now" : "Waiting"}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {room.domain}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {room.topic}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />{" "}
                          {room.participants.length} participants
                        </span>
                      </div>
                      {room.meeting_link && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <ExternalLink className="w-3 h-3" />
                          <span>External video call available</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isAdmin && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleEndSession(room.id)}
                          title="End Session"
                        >
                          <StopCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        onClick={() => handleJoinRoom(room.id)}
                        disabled={isJoining === room.id}
                        variant="default"
                      >
                        {isJoining === room.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            {isExpert ? "Moderate" : isAdmin ? "View" : "Join"}{" "}
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-medium text-foreground">
                No active sessions
              </p>
              <p className="text-sm text-muted-foreground">
                Check back later for new discussions.
              </p>
            </div>
          )}
        </section>
      </main>

      {isAdmin && (
        <CreateSessionModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateSession}
        />
      )}
    </div>
  );
}
