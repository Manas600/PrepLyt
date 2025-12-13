import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { RatingModal } from "@/components/RatingModal";
import {
  ArrowLeft,
  Users,
  Star,
  Loader2,
  MessageSquare,
  ExternalLink,
  Shield,
  Video,
  Mic,
  MicOff,
  Clock,
  AlertCircle,
  CheckCircle2,
  ListTodo,
  Lightbulb,
  Briefcase,
} from "lucide-react";

interface Participant {
  id: string;
  name: string;
  role: string;
}

interface Feedback {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  student: { name: string } | null;
  expert: { name: string } | null;
}

interface Room {
  id: string;
  topic: string;
  domain: string;
  status: string;
  meeting_link: string | null;
  participants: Participant[];
  host_id: string;
  created_at: string;
}

// Added Profile interface
interface Profile {
  id: string;
  name: string;
  role: string;
  points: number;
}

export default function MeetingRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const { profile: contextProfile, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeProfile, setActiveProfile] = useState<Profile | null>(
    contextProfile as Profile | null
  );
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [feedbackFeed, setFeedbackFeed] = useState<Feedback[]>([]);
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);
  const [ratingTarget, setRatingTarget] = useState<Participant | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  // Sync Context Profile
  useEffect(() => {
    if (contextProfile) setActiveProfile(contextProfile as Profile);
  }, [contextProfile]);

  // Auth Check
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Self-Healing Profile Fetch
  useEffect(() => {
    const loadProfileLocally = async () => {
      if (user && !activeProfile) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (data) setActiveProfile(data as Profile);
      }
    };
    loadProfileLocally();
  }, [user, activeProfile]);

  // Fetch Room Data
  useEffect(() => {
    if (!roomId) return;

    const fetchRoom = async () => {
      try {
        const { data, error } = await supabase
          .from("rooms")
          .select("*")
          .eq("id", roomId)
          .single();

        if (error || !data) {
          toast({
            title: "Room not found",
            description: "The session does not exist.",
            variant: "destructive",
          });
          navigate("/dashboard");
          return;
        }

        setRoom(data as unknown as Room);
        setParticipants((data.participants as unknown as Participant[]) || []);

        if (data.status === "waiting") {
          await supabase
            .from("rooms")
            .update({ status: "live" })
            .eq("id", roomId);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingRoom(false);
      }
    };

    fetchRoom();
  }, [roomId, navigate, toast]);

  // Realtime Updates
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const updatedRoom = payload.new as Room;
          setRoom(updatedRoom);
          setParticipants(
            (updatedRoom.participants as unknown as Participant[]) || []
          );

          if (updatedRoom.status === "completed") {
            toast({
              title: "Session Ended",
              description: "The admin has closed this session.",
            });
            navigate("/dashboard");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, navigate, toast]);

  const handleOpenMeetingLink = async () => {
    if (!room?.meeting_link || !activeProfile) return;

    const alreadyJoined = participants.some((p) => p.id === activeProfile.id);

    if (alreadyJoined) {
      window.open(room.meeting_link, "_blank");
      return;
    }

    setIsCheckingIn(true);

    try {
      const { data: currentRoom } = await supabase
        .from("rooms")
        .select("participants")
        .eq("id", roomId)
        .single();

      const currentParticipants =
        (currentRoom?.participants as unknown as Participant[]) || [];

      if (!currentParticipants.some((p) => p.id === activeProfile.id)) {
        const newParticipant = {
          id: activeProfile.id,
          name: activeProfile.name,
          role: activeProfile.role,
        };
        const updatedParticipants = [...currentParticipants, newParticipant];

        await supabase
          .from("rooms")
          .update({
            participants: JSON.parse(JSON.stringify(updatedParticipants)),
          })
          .eq("id", roomId);
      }

      window.open(room.meeting_link, "_blank");
      toast({
        title: "Checked in!",
        description: "You are now visible in the roster.",
      });
    } catch (error) {
      toast({
        title: "Check-in failed",
        description: "Could not join session.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleSubmitRating = async (rating: number, comment: string) => {
    if (!activeProfile || !ratingTarget || !roomId) return;

    try {
      await supabase.from("feedback").insert({
        room_id: roomId,
        student_id: ratingTarget.id,
        expert_id: activeProfile.id,
        rating,
        comment,
      });

      const { data: studentData } = await supabase
        .from("profiles")
        .select("points")
        .eq("id", ratingTarget.id)
        .single();
      if (studentData) {
        await supabase
          .from("profiles")
          .update({ points: studentData.points + rating * 10 })
          .eq("id", ratingTarget.id);
      }

      toast({
        title: "Rating submitted",
        description: `Rated ${ratingTarget.name} ${rating} stars.`,
      });
      setRatingTarget(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit rating.",
        variant: "destructive",
      });
    }
  };

  if (loading || isLoadingRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!room || !activeProfile) return null;

  const isExpert = activeProfile.role === "expert";
  const isAdmin = activeProfile.role === "admin";
  const canRate = isExpert || isAdmin;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Navigation */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            title="Back to Dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">
                {room.topic}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold capitalize">
                {room.domain}
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              Session ID:{" "}
              <span className="font-mono text-xs">{room.id.slice(0, 8)}</span>
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* LEFT: Main Action & SOPs */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. JOIN ACTION CARD */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-center relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-teal-500 to-transparent"></div>

                <Video className="w-12 h-12 mx-auto mb-4 text-teal-400 relative z-10" />
                <h2 className="text-2xl font-bold text-white mb-2 relative z-10">
                  Join the Discussion
                </h2>
                <p className="text-slate-400 mb-6 max-w-md mx-auto text-sm relative z-10">
                  The video call happens on an external platform (Google
                  Meet/Zoom). Keep this tab open for ratings.
                </p>
                {room.meeting_link ? (
                  <Button
                    size="lg"
                    onClick={handleOpenMeetingLink}
                    disabled={isCheckingIn}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-8 relative z-10 shadow-lg shadow-teal-900/50"
                  >
                    {isCheckingIn ? (
                      <Loader2 className="animate-spin mr-2" />
                    ) : (
                      <ExternalLink className="mr-2 h-5 w-5" />
                    )}
                    {isCheckingIn ? "Checking in..." : "Open Meeting Link"}
                  </Button>
                ) : (
                  <Button disabled variant="secondary">
                    No Link Available
                  </Button>
                )}
              </div>
            </div>

            {/* 2. STANDARD OPERATING PROCEDURES (SOP) */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Mandatory Read
                </span>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  Before You Enter the Room
                </h3>
              </div>

              {/* General Guidelines */}
              <div className="mb-6 bg-primary/5 border border-primary/10 rounded-lg p-4">
                <h4 className="font-semibold text-primary mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> General Guidelines
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    Sessions are conducted strictly by{" "}
                    <strong>Industry Experts</strong>. Maintain professionalism.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    Join the session <strong>5 minutes before</strong> the
                    scheduled time.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    Ensure you are in a quiet environment with stable internet.
                  </li>
                </ul>
              </div>

              {/* Camera & Audio Grid */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-lg border border-border bg-muted/20 flex items-start gap-3">
                  <Video className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground text-sm">
                      Camera Requirements
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Camera must remain{" "}
                      <strong className="text-green-500">ON</strong> throughout
                      the session for evaluation.
                    </p>
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-border bg-muted/20 flex items-start gap-3">
                  <MicOff className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground text-sm">
                      Audio Hygiene
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Keep your microphone{" "}
                      <strong className="text-yellow-500">muted</strong> when
                      not speaking to avoid echo.
                    </p>
                  </div>
                </div>
              </div>

              {/* GD Structure Timeline */}
              <div className="mb-6">
                <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> GD Structure
                </h4>
                <div className="relative pl-4 border-l-2 border-border space-y-6">
                  <div className="relative">
                    <div className="absolute -left-[21px] top-0 w-4 h-4 rounded-full bg-primary/20 border-2 border-primary"></div>
                    <p className="text-sm font-bold text-foreground">
                      1. Preparation (1 min)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Read the topic carefully. No speaking allowed.
                    </p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[21px] top-0 w-4 h-4 rounded-full bg-primary/20 border-2 border-primary"></div>
                    <p className="text-sm font-bold text-foreground">
                      2. Discussion (10 mins)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Be concise. Don't interrupt. Support points with logic.
                    </p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[21px] top-0 w-4 h-4 rounded-full bg-primary/20 border-2 border-primary"></div>
                    <p className="text-sm font-bold text-foreground">
                      3. Conclusion (2 mins)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Summarize the group's view. No new points.
                    </p>
                  </div>
                </div>
              </div>

              {/* Checklist */}
              <div className="bg-slate-900/5 dark:bg-white/5 p-4 rounded-lg">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <ListTodo className="w-4 h-4" /> Ready to Join?
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" /> Camera
                    is working
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" /> Mic
                    check done
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" /> Notepad
                    & Pen ready
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />{" "}
                    Professional dress code
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Participants Roster (Sticky on Desktop) */}
          <div className="h-fit space-y-6">
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden sticky top-6">
              <div className="p-4 border-b border-border bg-muted/30">
                <h3 className="font-semibold flex items-center gap-2 text-foreground">
                  <Users className="w-5 h-5 text-primary" />
                  Roster ({participants.length})
                </h3>
              </div>
              <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                        ${
                          p.role === "expert"
                            ? "bg-purple-100 text-purple-700"
                            : p.role === "admin"
                            ? "bg-green-100 text-green-700"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {p.name}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {p.role}
                        </p>
                      </div>
                    </div>

                    {/* Rating Button */}
                    {canRate && p.role === "student" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10"
                        onClick={() => setRatingTarget(p)}
                        title={`Rate ${p.name}`}
                      >
                        <Star className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {participants.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Waiting for participants...
                  </div>
                )}
              </div>
            </div>

            {/* Quick Tips for Students */}
            {!canRate && (
              <div className="bg-yellow-50/50 border border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-800 p-4 rounded-xl">
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-500 mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" /> Pro Tip
                </h4>
                <p className="text-xs text-yellow-700 dark:text-yellow-600">
                  Don't just speak often; speak with value. Quality of points{" "}
                  {">"} Quantity of words.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <RatingModal
        isOpen={!!ratingTarget}
        onClose={() => setRatingTarget(null)}
        onSubmit={handleSubmitRating}
        studentName={ratingTarget?.name || ""}
      />
    </div>
  );
}
