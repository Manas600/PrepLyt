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
  Briefcase,
  ExternalLink,
  Circle,
  Shield,
  Video,
  GraduationCap,
  Clock,
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

// Added Profile interface to replace 'any'
interface Profile {
  id: string;
  name: string;
  role: string;
  points: number;
  // Add other profile fields if necessary
}

export default function MeetingRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  // 1. Get 'user' directly to verify auth status, ignoring broken 'profile' context if needed
  const { profile: contextProfile, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Local state for profile (Self-healing)
  // FIX: Replaced <any> with <Profile | null>
  const [activeProfile, setActiveProfile] = useState<Profile | null>(
    contextProfile as Profile | null
  );

  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [feedbackFeed, setFeedbackFeed] = useState<Feedback[]>([]);
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);
  const [ratingTarget, setRatingTarget] = useState<Participant | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  // 2. Sync Context Profile if available
  useEffect(() => {
    if (contextProfile) setActiveProfile(contextProfile as Profile);
  }, [contextProfile]);

  // 3. ROBUST AUTH CHECK: Only redirect if NO USER (Auth) is found.
  useEffect(() => {
    if (!loading && !user) {
      console.log("No authenticated user found. Redirecting to Auth.");
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // 4. SELF-HEALING: Fetch Profile Locally if Context Failed
  useEffect(() => {
    const loadProfileLocally = async () => {
      if (user && !activeProfile) {
        console.log("Context profile missing. Fetching locally...");
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id) // Correct column is 'id'
          .single();

        if (data) {
          console.log("Local profile fetch success.");
          // Cast data to Profile type since Supabase returns general objects
          setActiveProfile(data as Profile);
        } else {
          console.error("Local profile fetch failed:", error);
        }
      }
    };
    loadProfileLocally();
  }, [user, activeProfile]);

  // 5. Fetch Room Data
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
          console.error("Room fetch error:", error);
          toast({
            title: "Room not found",
            description: "The session does not exist or has been deleted.",
            variant: "destructive",
          });
          navigate("/dashboard");
          return;
        }

        setRoom(data as unknown as Room);
        setParticipants((data.participants as unknown as Participant[]) || []);

        // Auto-update status if waiting
        if (data.status === "waiting") {
          await supabase
            .from("rooms")
            .update({ status: "live" })
            .eq("id", roomId);
        }
      } catch (err) {
        console.error("Unexpected error fetching room:", err);
      } finally {
        setIsLoadingRoom(false);
      }
    };

    fetchRoom();
  }, [roomId, navigate, toast]);

  // 6. Realtime Room Updates
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

  // 7. Logic Functions
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
      console.error("Check-in error:", error);
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

      // Update points
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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Render Loading
  if (loading || isLoadingRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If Auth user exists but profile is still fetching
  if (user && !activeProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <span className="text-muted-foreground">Loading Profile...</span>
      </div>
    );
  }

  if (!room || !activeProfile) return null;

  const isExpert = activeProfile.role === "expert";
  const isAdmin = activeProfile.role === "admin";
  const canRate = isExpert || isAdmin;

  // Filter participants
  const students = participants.filter((p) => p.role === "student");
  const experts = participants.filter(
    (p) => p.role === "expert" || p.role === "admin"
  );

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
            <h1 className="text-2xl font-bold text-foreground">{room.topic}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="capitalize">{room.domain}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Circle
                  className={`w-2 h-2 ${
                    room.status === "live"
                      ? "fill-green-500 text-green-500"
                      : "fill-yellow-500 text-yellow-500"
                  }`}
                />
                {room.status === "live" ? "Live Session" : "Waiting Room"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* LEFT: Main Action Card */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="bg-slate-900 p-8 text-center">
              <Video className="w-12 h-12 mx-auto mb-4 text-teal-400" />
              <h2 className="text-2xl font-bold text-white mb-2">
                Join the Discussion
              </h2>
              <p className="text-slate-400 mb-6 max-w-md mx-auto text-sm">
                The video call happens on an external platform (Google
                Meet/Zoom). Keep this tab open to see the roster and receive
                ratings.
              </p>
              {room.meeting_link ? (
                <Button
                  size="lg"
                  onClick={handleOpenMeetingLink}
                  disabled={isCheckingIn}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-8"
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

            <div className="p-6 bg-card">
              <div className="bg-blue-50/50 border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Instructions
                </h3>
                <ul className="list-disc list-inside text-sm text-blue-800 dark:text-blue-400 space-y-1">
                  <li>Please keep your camera ON during the session.</li>
                  <li>Mute your microphone when you are not speaking.</li>
                  <li>Experts will rate your performance in real-time.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* RIGHT: Participants Roster */}
          <div className="bg-card border border-border rounded-xl shadow-sm h-fit">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Participants ({participants.length})
              </h3>
            </div>
            <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                      ${
                        p.role === "expert"
                          ? "bg-purple-100 text-purple-700"
                          : p.role === "admin"
                          ? "bg-green-100 text-green-700"
                          : "bg-teal-100 text-teal-700"
                      }`}
                    >
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
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
                      className="text-muted-foreground hover:text-yellow-500"
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
