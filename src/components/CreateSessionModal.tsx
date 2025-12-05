import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, Link as LinkIcon } from 'lucide-react';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { domain: string; topic: string; meetingLink: string }) => Promise<void>;
}

const DOMAINS = [
  { id: 'marketing', name: 'Marketing' },
  { id: 'tech', name: 'Technology' },
  { id: 'finance', name: 'Finance' },
  { id: 'business', name: 'Business' }
];

const TOPIC_SUGGESTIONS: Record<string, string[]> = {
  marketing: ['AI in Digital Marketing', 'Social Media Strategy 2024', 'Brand Building in Gen-Z Era'],
  tech: ['Future of AI', 'Cloud Computing Trends', 'Cybersecurity Challenges'],
  finance: ['Cryptocurrency Adoption', 'Sustainable Investing', 'FinTech Revolution'],
  business: ['Remote Work Culture', 'Startup Ecosystem', 'Global Supply Chain']
};

export function CreateSessionModal({ isOpen, onClose, onSubmit }: CreateSessionModalProps) {
  const [domain, setDomain] = useState('');
  const [topic, setTopic] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateTopic = () => {
    if (!domain) {
      setError('Please select a domain first');
      return;
    }
    const topics = TOPIC_SUGGESTIONS[domain] || [];
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    setTopic(randomTopic);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!domain || !topic || !meetingLink) {
      setError('Please fill in all fields');
      return;
    }

    // Validate meeting link
    if (!meetingLink.includes('meet.google.com') && !meetingLink.includes('zoom.us')) {
      setError('Please enter a valid Google Meet or Zoom link');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ domain, topic, meetingLink });
      // Reset form
      setDomain('');
      setTopic('');
      setMeetingLink('');
      onClose();
    } catch {
      setError('Failed to create session. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Create New Session</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="domain">Domain</Label>
            <Select value={domain} onValueChange={setDomain}>
              <SelectTrigger>
                <SelectValue placeholder="Select a domain" />
              </SelectTrigger>
              <SelectContent>
                {DOMAINS.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic">Topic</Label>
            <div className="flex gap-2">
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter discussion topic"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleGenerateTopic}
                title="Generate AI topic"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meetingLink">Meeting Link</Label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="meetingLink"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="Paste Google Meet or Zoom link"
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Create a meeting in Google Meet or Zoom and paste the link here
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Session'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
