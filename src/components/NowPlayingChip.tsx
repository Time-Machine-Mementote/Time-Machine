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
    <Card className="absolute top-16 sm:top-20 left-2 right-2 sm:left-4 sm:right-4 z-10 p-2 sm:p-3 bg-white/90 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Volume2 className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-xs sm:text-sm font-medium text-gray-900 truncate">
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
          className="h-7 w-7 sm:h-8 sm:w-8 text-gray-500 hover:text-gray-700 flex-shrink-0"
        >
          <SkipForward className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      </div>
    </Card>
  );
}
