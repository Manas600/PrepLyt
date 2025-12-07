import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CreateSessionModal } from "@/components/CreateSessionModal";
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

export default function Dashboard() {
  const { profile: contextProfile, user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Local profile state to bypass context delay
  const [dashboardProfile, setDashboardProfile] = useState<any>(null);

  const [activeRooms, setActiveRooms] = useState<Room[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isJoining, setIsJoining] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [setupStatus, setSetupStatus] = useState("Initializing...");

  // 1. Sync Context to Local State
  useEffect(() => {
    if (contextProfile) {
      setDashboardProfile(contextProfile);
    }
  }, [contextProfile]);

  // 2. Redirect only if completely unauthenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // 3. ROBUST SELF-HEALING: Fetch/Create profile locally to avoid Reload Loops
  useEffect(() => {
    const initializeProfile = async () => {
      // Only proceed if user is logged in but we don't have a profile yet
      if (!loading && user && !dashboardProfile) {
        setSetupStatus("Checking profile data...");

        try {
          // A. Try fetching directly from DB (bypassing Context delay)
          const { data: existing, error: fetchErr } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

          if (existing) {
            console.log("Profile found in DB. Setting local state.");
            setDashboardProfile(existing);
            return;
          }

          // B. If truly missing, create it
          setSetupStatus("Creating your profile...");
          const newProfile = {
            id: user.id,
            name:
              user.user_metadata?.name || user.email?.split("@")[0] || "User",
            role: "student", // Default role
            points: 50,
          };

          const { error: insertErr } = await supabase
            .from("profiles")
            .insert(newProfile);

          if (insertErr) {
            // Handle race condition (created by trigger in background)
            if (insertErr.code === "23505") {
              console.log(
                "Profile already exists (race condition). Fetching..."
              );
              const { data: retry } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();
              if (retry) setDashboardProfile(retry);
            } else {
              console.error("Failed to create profile:", insertErr);
              setSetupStatus("Error creating profile. Please retry.");
            }
          } else {
            console.log("Profile created successfully.");
            setDashboardProfile(newProfile);
          }
        } catch (err) {
          console.error("Unexpected error:", err);
          setSetupStatus("An unexpected error occurred.");
        }
      }
    };

    initializeProfile();
  }, [user, dashboardProfile, loading]);

  // 4. Fetch Rooms (Dependent on dashboardProfile)
  useEffect(() => {
    if (dashboardProfile) {
      fetchActiveRooms();

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
      console.error("Error joining room:", error);
      toast({
        title: "Error",
        description: "Failed to join the session.",
        variant: "destructive",
      });
    } finally {
      setIsJoining(null);
    }
  };

  const handleEndSession = async (roomId: string) => {
    if (
      !confirm(
        "Are you sure you want to end this session? It will be moved to history."
      )
    )
      return;

    try {
      const { error } = await supabase
        .from("rooms")
        .update({ status: "completed" })
        .eq("id", roomId);

      if (error) throw error;

      toast({
        title: "Session Ended",
        description: "The session has been marked as completed.",
      });
      fetchActiveRooms();
    } catch (error: any) {
      console.error("DB Error:", error);
      toast({
        title: "Error Ending Session",
        description: error.message || "An unexpected error occurred",
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

    const { data: newRoom, error } = await supabase
      .from("rooms")
      .insert({
        topic: data.topic,
        domain: data.domain,
        meeting_link: data.meetingLink,
        status: "waiting",
        participants: [],
        host_id: dashboardProfile.id,
      })
      .select()
      .single();

    if (error) throw error;

    toast({
      title: "Session created",
      description: "Your session is now live.",
    });

    setShowCreateModal(false);
    fetchActiveRooms();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Fallback for missing profile
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

  const getRoleBadge = (role: AppRole) => {
    switch (role) {
      case "admin":
        return {
          label: "Admin",
          color: "bg-success/20 text-success",
          icon: Shield,
        };
      case "expert":
        return {
          label: "Expert",
          color: "bg-warning/20 text-warning",
          icon: Briefcase,
        };
      default:
        return {
          label: "Student",
          color: "bg-primary/20 text-primary",
          icon: GraduationCap,
        };
    }
  };

  const roleBadge = getRoleBadge(dashboardProfile.role);
  const RoleIcon = roleBadge.icon;

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
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Welcome,</span>
                <span className="font-medium text-foreground">
                  {dashboardProfile.name}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${roleBadge.color}`}
                >
                  <RoleIcon className="w-3 h-3" />
                  {roleBadge.label}
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
        {isAdmin && (
          <div className="mb-8 p-6 bg-gradient-to-r from-success/10 to-success/5 border border-success/20 rounded-xl animate-slide-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                  <Settings className="w-6 h-6 text-success" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    Admin Control Panel
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Manage sessions and organize discussions
                  </p>
                </div>
              </div>
              <Button
                size="lg"
                onClick={() => setShowCreateModal(true)}
                className="bg-success hover:bg-success/90"
              >
                <Plus className="mr-2 h-5 w-5" />
                Schedule Session
              </Button>
            </div>
          </div>
        )}

        {isExpert && (
          <div className="mb-8 p-6 bg-gradient-to-r from-warning/10 to-warning/5 border border-warning/20 rounded-xl animate-slide-up">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-warning" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Ready to Evaluate
                </h2>
                <p className="text-sm text-muted-foreground">
                  Select a session below to moderate and provide feedback
                </p>
              </div>
            </div>
          </div>
        )}

        {isStudent && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-slide-up">
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
              <p className="text-xs text-muted-foreground mt-2">
                Complete a session
              </p>
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
              <p className="text-xs text-muted-foreground mt-2">
                Join your first!
              </p>
            </div>
          </div>
        )}

        <section
          className="animate-slide-up"
          style={{ animationDelay: "0.2s" }}
        >
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
                          <Users className="w-3.5 h-3.5" />
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
                          className="gap-2"
                          onClick={() => handleEndSession(room.id)}
                          title="End Session (Archive)"
                        >
                          <StopCircle className="h-4 w-4" />
                          <span className="hidden sm:inline">End Session</span>
                        </Button>
                      )}

                      <Button
                        onClick={() => handleJoinRoom(room.id)}
                        disabled={isJoining === room.id}
                        variant={isExpert ? "default" : "default"}
                      >
                        {isJoining === room.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            {isExpert
                              ? "Enter as Moderator"
                              : isAdmin
                              ? "View Session"
                              : "Join"}
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
              <p className="text-lg font-medium text-foreground mb-1">
                No active sessions
              </p>
              <p className="text-sm text-muted-foreground">
                {isAdmin
                  ? 'Click "Schedule Session" to create a new discussion'
                  : isExpert
                  ? "No sessions available to moderate. Check back soon."
                  : "Check back soon or wait for an admin to schedule a session"}
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
