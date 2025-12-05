import { useEffect, useState } from 'react';
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
  Loader2,
  MessageSquare,
  Crown,
  GraduationCap,
  Briefcase,
  ExternalLink,
  Clock,
  Circle
} from 'lucide-react';

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

export default function MeetingRoom() {
  const { roomId } = useParams();
  const { profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [feedbackFeed, setFeedbackFeed] = useState<Feedback[]>([]);
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);
  const [ratingTarget, setRatingTarget] = useState<Participant | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

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
          description: 'The session does not exist.',
          variant: 'destructive'
        });
        navigate('/dashboard');
        return;
      }

      setRoom(data as unknown as Room);
      setParticipants((data.participants as unknown as Participant[]) || []);
      setIsLoadingRoom(false);

      // Update status to live if waiting
      if (data.status === 'waiting') {
        await supabase
          .from('rooms')
          .update({ status: 'live' })
          .eq('id', roomId);
      }
    };

    fetchRoom();
  }, [roomId, navigate, toast]);

  // Fetch feedback for this room
  useEffect(() => {
    if (!roomId) return;

    const fetchFeedback = async () => {
      const { data } = await supabase
        .from('feedback')
        .select('id, rating, comment, created_at, student_id, expert_id')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false });

      if (data) {
        // Fetch names for feedback
        const studentIds = [...new Set(data.map(f => f.student_id).filter(Boolean))];
        const expertIds = [...new Set(data.map(f => f.expert_id).filter(Boolean))];
        
        const [{ data: students }, { data: experts }] = await Promise.all([
          supabase.from('profiles').select('id, name').in('id', studentIds),
          supabase.from('profiles').select('id, name').in('id', expertIds)
        ]);

        const studentsMap = new Map(students?.map(s => [s.id, s.name]) || []);
        const expertsMap = new Map(experts?.map(e => [e.id, e.name]) || []);

        const feedbackWithNames = data.map(f => ({
          ...f,
          student: f.student_id ? { name: studentsMap.get(f.student_id) || 'Unknown' } : null,
          expert: f.expert_id ? { name: expertsMap.get(f.expert_id) || 'Unknown' } : null
        }));

        setFeedbackFeed(feedbackWithNames);
      }
    };

    fetchFeedback();
  }, [roomId]);

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

  // Subscribe to feedback for real-time notifications and feed updates
  useEffect(() => {
    if (!profile || !roomId) return;

    const channel = supabase
      .channel('feedback-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'feedback',
          filter: `room_id=eq.${roomId}`
        },
        async (payload) => {
          const feedback = payload.new as { id: string; rating: number; comment: string; student_id: string; expert_id: string; created_at: string };
          
          // Fetch names
          const [{ data: student }, { data: expert }] = await Promise.all([
            supabase.from('profiles').select('name').eq('id', feedback.student_id).single(),
            supabase.from('profiles').select('name').eq('id', feedback.expert_id).single()
          ]);

          const newFeedback: Feedback = {
            ...feedback,
            student: student ? { name: student.name } : null,
            expert: expert ? { name: expert.name } : null
          };

          setFeedbackFeed(prev => [newFeedback, ...prev]);

          // Show toast for the student who received the rating
          if (feedback.student_id === profile.id) {
            toast({
              title: `You received ${feedback.rating} stars!`,
              description: feedback.comment || 'Keep up the great work!',
            });
            refreshProfile();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, roomId, toast, refreshProfile]);

  const handleLeave = async () => {
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

  const handleOpenMeetingLink = async () => {
    if (!room?.meeting_link || !profile) return;

    // Check if user is already in participants
    const alreadyJoined = participants.some(p => p.id === profile.id);
    
    if (alreadyJoined) {
      // Already checked in, just open the link
      window.open(room.meeting_link, '_blank');
      return;
    }

    setIsCheckingIn(true);
    
    try {
      // Fetch the latest participants to avoid race conditions
      const { data: currentRoom, error: fetchError } = await supabase
        .from('rooms')
        .select('participants')
        .eq('id', roomId)
        .single();

      if (fetchError) throw fetchError;

      const currentParticipants = (currentRoom?.participants as unknown as Participant[]) || [];
      
      // Check again if already in participants (in case of concurrent joins)
      if (!currentParticipants.some(p => p.id === profile.id)) {
        const newParticipant: Participant = {
          id: profile.id,
          name: profile.name,
          role: profile.role
        };

        const updatedParticipants = [...currentParticipants, newParticipant];

        const { error: updateError } = await supabase
          .from('rooms')
          .update({ participants: JSON.parse(JSON.stringify(updatedParticipants)) })
          .eq('id', roomId);

        if (updateError) throw updateError;
      }

      // Success - open the meeting link
      window.open(room.meeting_link, '_blank');
      
      toast({
        title: 'Checked in!',
        description: 'You are now visible in the session roster.',
      });
    } catch (error) {
      console.error('Error checking in:', error);
      toast({
        title: 'Check-in failed',
        description: 'Could not join the session. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleRateStudent = (participant: Participant) => {
    setRatingTarget(participant);
  };

  const handleSubmitRating = async (rating: number, comment: string) => {
    if (!profile || !ratingTarget || !roomId) return;

    try {
      await supabase
        .from('feedback')
        .insert({
          room_id: roomId,
          student_id: ratingTarget.id,
          expert_id: profile.id,
          rating,
          comment
        });

      // Update student points
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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading || isLoadingRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!room || !profile) return null;

  const isExpert = profile.role === 'expert';
  const students = participants.filter(p => p.role === 'student');
  const experts = participants.filter(p => p.role === 'expert');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={handleLeave}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="font-semibold text-foreground">{room.topic}</h1>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="capitalize">{room.domain}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Circle className={`w-2 h-2 ${room.status === 'live' ? 'fill-success text-success' : 'fill-warning text-warning'}`} />
                      {room.status === 'live' ? 'Live' : 'Waiting'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {room.meeting_link && (
              <Button onClick={handleOpenMeetingLink} className="gap-2" disabled={isCheckingIn}>
                {isCheckingIn ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking in...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4" />
                    Join Video Call
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Meeting Link Banner */}
        {room.meeting_link && (
          <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Video Call Ready</p>
              <p className="text-sm text-muted-foreground">Click the button to join the external video call in a new tab</p>
            </div>
            <Button size="lg" onClick={handleOpenMeetingLink} className="gap-2" disabled={isCheckingIn}>
              {isCheckingIn ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Checking in...
                </>
              ) : (
                <>
                  <ExternalLink className="h-5 w-5" />
                  Open Meeting Link
                </>
              )}
            </Button>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Roster */}
          <div className="space-y-6">
            {/* Students Roster */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/30">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  Students ({students.length})
                </h2>
              </div>
              <div className="p-4 space-y-2">
                {students.length > 0 ? (
                  students.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <GraduationCap className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground flex items-center gap-2">
                            {participant.name}
                            {participant.id === profile.id && (
                              <span className="text-xs text-primary">(You)</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">Student</p>
                        </div>
                      </div>
                      
                      {isExpert && participant.id !== profile.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-star hover:text-star hover:bg-star/10 gap-1"
                          onClick={() => handleRateStudent(participant)}
                        >
                          <Star className="h-4 w-4" />
                          Rate
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No students have joined yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Experts Roster */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/30">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-warning" />
                  Experts ({experts.length})
                </h2>
              </div>
              <div className="p-4 space-y-2">
                {experts.length > 0 ? (
                  experts.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                    >
                      <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-warning" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground flex items-center gap-2">
                          {participant.name}
                          {room.host_id === participant.id && (
                            <Crown className="w-4 h-4 text-star" />
                          )}
                          {participant.id === profile.id && (
                            <span className="text-xs text-primary">(You)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">Expert</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Briefcase className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No experts have joined yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Feedback Feed */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/30">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Star className="w-5 h-5 text-star" />
                Live Feedback Feed
              </h2>
            </div>
            <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
              {feedbackFeed.length > 0 ? (
                feedbackFeed.map((feedback) => (
                  <div
                    key={feedback.id}
                    className="p-4 rounded-lg bg-muted/30 border border-border/50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-foreground">
                          {feedback.student?.name || 'Unknown Student'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Rated by {feedback.expert?.name || 'Unknown Expert'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < feedback.rating
                                ? 'fill-star text-star'
                                : 'text-muted-foreground'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {feedback.comment && (
                      <p className="text-sm text-muted-foreground">{feedback.comment}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(feedback.created_at)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Star className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium text-foreground mb-1">No feedback yet</p>
                  <p className="text-sm text-muted-foreground">
                    {isExpert 
                      ? 'Click "Rate" next to a student to give feedback'
                      : 'Feedback from experts will appear here in real-time'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

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
