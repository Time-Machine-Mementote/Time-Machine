import { useState } from 'react';
import { Heart, Clock, Play, Eye, MoreVertical, Mic, Image, FileText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { Database } from '@/integrations/supabase/types';

type JournalEntry = Database['public']['Tables']['journal_entries']['Row'] & {
  generated_memory?: Database['public']['Tables']['generated_memories']['Row'];
};
import { MemoryService } from '@/services/memoryService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MemoryCardProps {
  entry: JournalEntry;
  onToggleFavorite: (entryId: string) => void;
}

const MemoryCard = ({ entry, onToggleFavorite }: MemoryCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingMemory, setIsGeneratingMemory] = useState(false);
  const memoryService = new MemoryService();

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'voice':
        return <Mic className="w-4 h-4" />;
      case 'media':
        return <Image className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'voice':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'media':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const handleViewMemory = () => {
    // TODO: Add recall tracking to database
    setIsExpanded(!isExpanded);
  };

  const handlePlayAudio = () => {
    // TODO: Add audio playback functionality
    console.log('Play audio for entry:', entry.id);
  };

  const truncateText = (text: string, maxLength: number = 120) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Card className={cn(
      "glass-card transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer group"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge 
                variant="outline" 
                className={cn("text-xs", getTypeColor(entry.entry_type))}
              >
                {getTypeIcon(entry.entry_type)}
                <span className="ml-1 capitalize">{entry.entry_type}</span>
              </Badge>
              {entry.generated_memory && (
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                  ✨ AI Story
                </Badge>
              )}
            </div>
            <h3 className="font-crimson font-semibold text-lg text-foreground leading-tight">
              {entry.title}
            </h3>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(entry.id);
            }}
            className="shrink-0 opacity-70 hover:opacity-100 transition-all"
          >
            <Heart className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDate(entry.created_at)}
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            0 recalls
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Content Preview */}
          <div onClick={handleViewMemory}>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {isExpanded ? entry.content : truncateText(entry.content)}
            </p>
          </div>

          {/* Media Preview */}
          {entry.media_files && Array.isArray(entry.media_files) && entry.media_files.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {entry.media_files.slice(0, 3).map((file: { id: string; url?: string; name?: string }) => (
                <div key={file.id} className="shrink-0">
                  {file.url ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-16 h-16 object-cover rounded-lg border"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded-lg border flex items-center justify-center">
                      {getTypeIcon('media')}
                    </div>
                  )}
                </div>
              ))}
              {Array.isArray(entry.media_files) && entry.media_files.length > 3 && (
                <div className="w-16 h-16 bg-muted rounded-lg border flex items-center justify-center text-xs text-muted-foreground">
                  +{entry.media_files.length - 3}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewMemory}
              className="flex-1 text-xs"
            >
              <Eye className="w-3 h-3 mr-1" />
              {isExpanded ? 'Hide' : 'View'} Memory
            </Button>

            {/* Memory Generation / Playback Button */}
            {entry.generated_memory ? (
              <Button
                variant="outline"
                size="sm"
                className="text-xs bg-primary/10 text-primary border-primary/20"
                onClick={() => {
                  // Play the integrated memory experience
                  console.log('Playing integrated memory:', entry.generated_memory);
                }}
              >
                <Play className="w-3 h-3 mr-1" />
                Experience Memory
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={async () => {
                  setIsGeneratingMemory(true);
                  try {
                    await memoryService.generateMemory({
                      entryId: entry.id,
                      generateImage: true
                    });
                    // Refresh the page or update the entry to show the new memory
                    window.location.reload();
                  } catch (error) {
                    console.error('Failed to generate memory:', error);
                  } finally {
                    setIsGeneratingMemory(false);
                  }
                }}
                disabled={isGeneratingMemory}
              >
                <Sparkles className="w-3 h-3 mr-1" />
                {isGeneratingMemory ? 'Creating...' : 'Create Memory'}
              </Button>
            )}
          </div>

          {/* Integrated Memory Experience */}
          {isExpanded && entry.generated_memory && (
            <div className="mt-4 p-4 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg border border-primary/20">
              <h4 className="font-crimson font-semibold text-primary mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Your Memory Experience
              </h4>
              
              {/* Story Text */}
              <div className="mb-4">
                <h5 className="text-sm font-medium text-foreground mb-2">Story</h5>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {entry.generated_memory.story || 'Story generation in progress...'}
                </p>
              </div>

              {/* Audio Player */}
              {entry.generated_memory.audio_url && (
                <div className="mb-4">
                  <h5 className="text-sm font-medium text-foreground mb-2">Audio Narration</h5>
                  <audio 
                    controls 
                    className="w-full h-10"
                    preload="metadata"
                  >
                    <source src={entry.generated_memory.audio_url} type="audio/mpeg" />
                    <source src={entry.generated_memory.audio_url} type="audio/mp3" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}

              {/* Video/Image Display */}
              <div className="mb-4">
                <h5 className="text-sm font-medium text-foreground mb-2">Visual Memory</h5>
                
                {/* Prioritize video over image */}
                {entry.generated_memory.video_url ? (
                  <video 
                    src={entry.generated_memory.video_url} 
                    controls
                    loop
                    muted
                    className="w-full h-48 object-cover rounded-lg border shadow-sm"
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : entry.generated_memory.image_url ? (
                  <img 
                    src={entry.generated_memory.image_url} 
                    alt="Generated memory visualization"
                    className="w-full h-48 object-cover rounded-lg border shadow-sm"
                  />
                ) : (
                  <div className="w-full h-48 bg-muted rounded-lg border flex items-center justify-center text-muted-foreground">
                    <Sparkles className="w-8 h-8 mb-2" />
                    <p className="text-sm">Visual generation in progress...</p>
                  </div>
                )}
              </div>

              {/* Memory Status */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Status: {entry.generated_memory.status || 'Processing'}</span>
                <span>Generated: {formatDate(entry.generated_memory.created_at || '')}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MemoryCard;