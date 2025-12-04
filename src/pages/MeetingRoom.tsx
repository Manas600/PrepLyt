import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { RatingModal } from '@/components/RatingModal';
import { 
  ArrowLeft, 
  Users, 
  Star, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff,
  PhoneOff,
  Loader2,
  MessageSquare,
  Crown,
  GraduationCap,
  Briefcase
} from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  role: string;
}

interface Room {
  id: string;
  topic: string;
  domain: string;
  status: string;
  participants: Participant[];
  host_id: string;
  created_at: string;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: new (domain: string, options: JitsiOptions) => JitsiAPI;
  }
}

interface JitsiOptions {
  roomName: string;
  parentNode: HTMLElement;
  width: string;
  height: string;
  configOverwrite: {
    startWithAudioMuted: boolean;
    startWithVideoMuted: boolean;
    prejoinPageEnabled: boolean;
  };
  interfaceConfigOverwrite: {
    TOOLBAR_BUTTONS: string[];
    SHOW_JITSI_WATERMARK: boolean;
    SHOW_WATERMARK_FOR_GUESTS: boolean;
  };
  userInfo: {
    displayName: string;
  };
}

interface JitsiAPI {
  dispose: () => void;
  executeCommand: (command: string, value?: boolean) => void;
}

export default function MeetingRoom() {
  const { roomId } = useParams();
  const { profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<Participant | null>(null);
  
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<JitsiAPI | null>(null);

  useEffect(() => {
    if (!loading && !profile) {
      navigate('/auth');
    }
  }, [profile, loading, navigate]);

  // Fetch room data
  useEffect(() => {
    if (!roomId) return;

    const fetchRoom = async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (error || !data) {
        toast({
          title: 'Room not found',
          description: 'The discussion room does not exist.',
          variant: 'destructive'
        });
        navigate('/dashboard');
        return;
      }

      setRoom(data as unknown as Room);
      setParticipants((data.participants as unknown as Participant[]) || []);
      setIsLoadingRoom(false);
    };

    fetchRoom();
  }, [roomId, navigate, toast]);

  // Subscribe to room updates
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`
        },
        (payload) => {
          const updatedRoom = payload.new as Room;
          setRoom(updatedRoom);
          setParticipants((updatedRoom.participants as Participant[]) || []);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Subscribe to feedback for real-time notifications
  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel('feedback-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'feedback',
          filter: `student_id=eq.${profile.id}`
        },
        (payload) => {
          const feedback = payload.new as { rating: number; comment: string };
          toast({
            title: `You received ${feedback.rating} stars!`,
            description: feedback.comment || 'Keep up the great work!',
          });
          // Refresh profile to get updated points
          refreshProfile();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, toast, refreshProfile]);

  // Initialize Jitsi
  useEffect(() => {
    if (!room || !profile || !jitsiContainerRef.current) return;

    // Load Jitsi script
    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    script.onload = () => {
      if (!jitsiContainerRef.current) return;

      const options: JitsiOptions = {
        roomName: `GD_Master_${roomId}`,
        parentNode: jitsiContainerRef.current,
        width: '100%',
        height: '100%',
        configOverwrite: {
          startWithAudioMuted: profile.role === 'student',
          startWithVideoMuted: false,
          prejoinPageEnabled: false
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop',
            'fullscreen', 'fodeviceselection', 'hangup', 'chat',
            'settings', 'videoquality', 'tileview'
          ],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false
        },
        userInfo: {
          displayName: `${profile.name} (${profile.role})`
        }
      };

      jitsiApiRef.current = new window.JitsiMeetExternalAPI('meet.jit.si', options);

      // Update room status to live
      if (room.status === 'waiting') {
        supabase
          .from('rooms')
          .update({ status: 'live' })
          .eq('id', roomId);
      }
    };

    document.body.appendChild(script);

    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
      }
      script.remove();
    };
  }, [room, profile, roomId]);

  const handleToggleMute = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleAudio');
      setIsMuted(!isMuted);
    }
  };

  const handleToggleVideo = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleVideo');
      setIsVideoOff(!isVideoOff);
    }
  };

  const handleLeave = async () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
    }

    // Remove participant from room
    if (profile && room) {
      const updatedParticipants = participants.filter(p => p.id !== profile.id);
      await supabase
        .from('rooms')
        .update({ 
          participants: JSON.parse(JSON.stringify(updatedParticipants)),
          status: updatedParticipants.length === 0 ? 'ended' : room.status
        })
        .eq('id', roomId);
    }

    navigate('/dashboard');
  };

  const handleRateStudent = (participant: Participant) => {
    setRatingTarget(participant);
  };

  const handleSubmitRating = async (rating: number, comment: string) => {
    if (!profile || !ratingTarget || !roomId) return;

    try {
      // Insert feedback
      await supabase
        .from('feedback')
        .insert({
          room_id: roomId,
          student_id: ratingTarget.id,
          expert_id: profile.id,
          rating,
          comment
        });

      // Update student points (rating * 10 points)
      const { data: studentProfile } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', ratingTarget.id)
        .single();

      if (studentProfile) {
        await supabase
          .from('profiles')
          .update({ points: studentProfile.points + rating * 10 })
          .eq('id', ratingTarget.id);
      }

      toast({
        title: 'Rating submitted',
        description: `You rated ${ratingTarget.name} ${rating} stars.`
      });

      setRatingTarget(null);
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit rating. Please try again.',
        variant: 'destructive'
      });
    }
  };

  if (loading || isLoadingRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!room || !profile) return null;

  const isExpert = profile.role === 'expert';

  return (
    <div className="min-h-screen bg-background dark">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card/50 backdrop-blur-xl flex items-center px-4 gap-4">
        <Button variant="ghost" size="icon" onClick={handleLeave}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground text-sm">{room.topic}</h1>
            <p className="text-xs text-muted-foreground capitalize">{room.domain} Discussion</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            room.status === 'live' 
              ? 'bg-success/20 text-success' 
              : 'bg-warning/20 text-warning'
          }`}>
            {room.status === 'live' ? '● Live' : '○ Waiting'}
          </span>
        </div>
      </header>

      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Video Area */}
        <div className="flex-1 relative bg-card/30">
          <div ref={jitsiContainerRef} className="absolute inset-0" />
          
          {/* Control Bar */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 p-2 rounded-full bg-card/90 backdrop-blur-xl border border-border shadow-lg">
            <Button
              variant={isMuted ? "destructive" : "secondary"}
              size="icon"
              className="rounded-full w-12 h-12"
              onClick={handleToggleMute}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Button
              variant={isVideoOff ? "destructive" : "secondary"}
              size="icon"
              className="rounded-full w-12 h-12"
              onClick={handleToggleVideo}
            >
              {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>
            <Button
              variant="destructive"
              size="icon"
              className="rounded-full w-12 h-12"
              onClick={handleLeave}
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="w-72 meeting-sidebar flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Participants ({participants.length})
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    participant.role === 'expert' 
                      ? 'bg-warning/20' 
                      : 'bg-primary/20'
                  }`}>
                    {participant.role === 'expert' ? (
                      <Briefcase className="w-4 h-4 text-warning" />
                    ) : (
                      <GraduationCap className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm flex items-center gap-1">
                      {participant.name}
                      {room.host_id === participant.id && (
                        <Crown className="w-3 h-3 text-star" />
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{participant.role}</p>
                  </div>
                </div>
                
                {isExpert && participant.role === 'student' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-star hover:text-star hover:bg-star/10"
                    onClick={() => handleRateStudent(participant)}
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                )}

                {!isExpert && participant.id === profile.id && (
                  <span className="text-xs text-primary font-medium">You</span>
                )}
              </div>
            ))}

            {participants.length === 0 && (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No participants yet</p>
              </div>
            )}
          </div>

          {/* Expert Tip */}
          {isExpert && (
            <div className="p-4 border-t border-border">
              <div className="p-3 rounded-lg bg-primary/10 text-sm">
                <p className="text-primary font-medium">Expert Mode</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Click the star icon next to a student's name to rate their performance.
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Rating Modal */}
      <RatingModal
        isOpen={!!ratingTarget}
        onClose={() => setRatingTarget(null)}
        onSubmit={handleSubmitRating}
        studentName={ratingTarget?.name || ''}
      />
    </div>
  );
}
