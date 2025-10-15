// Now Playing Chip Component
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SkipForward, Volume2 } from 'lucide-react';
import type { Memory } from '@/types/memory';

interface NowPlayingChipProps {
  memory: Memory;
  onSkip: () => void;
}

export function NowPlayingChip({ memory, onSkip }: NowPlayingChipProps) {
  return (
    <Card className="absolute top-20 left-4 right-4 z-10 p-3 bg-white/90 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <Volume2 className="h-4 w-4 text-purple-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {memory.summary || 'Memory'}
            </h3>
            <p className="text-xs text-gray-500 truncate">
              {memory.place_name || 'Unknown location'}
            </p>
          </div>
        </div>

        <Button
          onClick={onSkip}
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-500 hover:text-gray-700"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
