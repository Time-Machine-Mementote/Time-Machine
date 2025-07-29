import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PenTool, Mic, Image, Save, Loader } from 'lucide-react';
import { toast } from 'sonner';
import VoiceRecorder from '@/components/VoiceRecorder';
import MediaUpload from '@/components/MediaUpload';
import { journalStorage, type MediaFile } from '@/utils/journalStorage';

const JournalEntry = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [audioBlob, setAudioBlob] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title for your journal entry');
      return;
    }

    if (!content.trim() && !audioBlob && mediaFiles.length === 0) {
      toast.error('Please add some content to your journal entry');
      return;
    }

    setIsLoading(true);

    try {
      const entry = journalStorage.saveEntry({
        title: title.trim(),
        content: content.trim(),
        type: activeTab as 'text' | 'voice' | 'media',
        audioBlob: audioBlob || undefined,
        mediaFiles: mediaFiles.length > 0 ? mediaFiles : undefined,
      });

      toast.success('Journal entry saved successfully!', {
        description: 'Your memory is being processed...',
      });

      // Navigate to Take Me Back page to show the saved entry
      navigate('/take-me-back');
    } catch (error) {
      console.error('Error saving journal entry:', error);
      toast.error('Failed to save journal entry. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setTitle('');
    setContent('');
    setAudioBlob('');
    setMediaFiles([]);
    toast.info('Entry cleared');
  };

  const isFormValid = title.trim() && (content.trim() || audioBlob || mediaFiles.length > 0);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-crimson font-bold text-foreground mb-4">
          Capture Your Moment
        </h1>
        <p className="text-lg text-muted-foreground">
          Share your thoughts, feelings, and experiences. Let's create something magical together.
        </p>
      </div>

      <div className="glass-card p-8 space-y-6">
        {/* Title Input */}
        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-medium text-foreground">
            What's on your mind?
          </label>
          <Input
            id="title"
            placeholder="Give your moment a title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="time-input text-lg font-crimson"
          />
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="text" className="flex items-center gap-2">
              <PenTool className="w-4 h-4" />
              Text
            </TabsTrigger>
            <TabsTrigger value="voice" className="flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Voice
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              Media
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="content" className="text-sm font-medium text-foreground">
                Tell your story...
              </label>
              <Textarea
                id="content"
                placeholder="What happened? How did it make you feel? Capture every detail that matters to you..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="time-input min-h-[200px] resize-none"
              />
            </div>
          </TabsContent>

          <TabsContent value="voice" className="space-y-4">
            <VoiceRecorder
              onRecordingComplete={setAudioBlob}
              existingRecording={audioBlob}
            />
            {audioBlob && (
              <div className="space-y-2">
                <label htmlFor="voice-content" className="text-sm font-medium text-foreground">
                  Add a written description (optional)
                </label>
                <Textarea
                  id="voice-content"
                  placeholder="Describe your voice recording or add additional context..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="time-input min-h-[100px] resize-none"
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="media" className="space-y-4">
            <MediaUpload
              onFilesChange={setMediaFiles}
              existingFiles={mediaFiles}
              maxFiles={5}
            />
            {mediaFiles.length > 0 && (
              <div className="space-y-2">
                <label htmlFor="media-content" className="text-sm font-medium text-foreground">
                  Describe your media (optional)
                </label>
                <Textarea
                  id="media-content"
                  placeholder="Tell us about these photos/videos. What memories do they hold?"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="time-input min-h-[100px] resize-none"
                />
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-6 border-t border-border">
          <Button
            onClick={handleSave}
            disabled={!isFormValid || isLoading}
            className="btn-ethereal flex-1"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader className="w-5 h-5 mr-2 animate-spin" />
                Saving Memory...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Save Memory
              </>
            )}
          </Button>
          
          <Button
            onClick={handleClear}
            variant="outline"
            size="lg"
            disabled={isLoading}
            className="px-8"
          >
            Clear
          </Button>
        </div>

        {/* Save Hint */}
        {isFormValid && (
          <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm text-primary">
              ✨ Your memory will be transformed into a beautiful story once saved
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default JournalEntry;