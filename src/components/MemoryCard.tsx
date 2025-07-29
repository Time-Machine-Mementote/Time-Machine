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
          {entry.media_files && (entry.media_files as any[]).length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {(entry.media_files as any[]).slice(0, 3).map((file: any) => (
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
              {(entry.media_files as any[]).length > 3 && (
                <div className="w-16 h-16 bg-muted rounded-lg border flex items-center justify-center text-xs text-muted-foreground">
                  +{(entry.media_files as any[]).length - 3}
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

            {/* TODO: Add audio playback when implemented */}

            {entry.generated_memory ? (
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  if (entry.generated_memory?.audio_url) {
                    const audio = new Audio(entry.generated_memory.audio_url);
                    audio.play();
                  }
                }}
              >
                ✨ Story
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
                  } finally {
                    setIsGeneratingMemory(false);
                  }
                }}
                disabled={isGeneratingMemory}
              >
                <Sparkles className="w-3 h-3 mr-1" />
                {isGeneratingMemory ? 'Generating...' : 'Generate'}
              </Button>
            )}
          </div>

          {/* Memory Story Preview */}
          {isExpanded && entry.generated_memory && (
            <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h4 className="font-crimson font-semibold text-primary mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                AI Generated Story
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                {truncateText(entry.generated_memory.story || '', 200)}
              </p>
              {entry.generated_memory.image_url && (
                <img 
                  src={entry.generated_memory.image_url} 
                  alt="Generated memory visualization"
                  className="w-full h-32 object-cover rounded-lg border"
                />
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MemoryCard;