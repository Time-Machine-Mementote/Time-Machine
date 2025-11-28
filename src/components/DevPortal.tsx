// Dev Portal Component
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Database, MapPin, Volume2, User, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { audioQueue } from '@/utils/audioQueue';
import { toast } from 'sonner';
import type { Memory } from '@/types/memory';

interface DevPortalProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation: { lat: number; lng: number; accuracy?: number } | null;
  userId?: string;
}

export function DevPortal({ isOpen, onClose, userLocation, userId }: DevPortalProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [queueInfo, setQueueInfo] = useState({ length: 0, playing: null as any });

  useEffect(() => {
    if (isOpen) {
      loadMemories();
      updateQueueInfo();
      const interval = setInterval(updateQueueInfo, 1000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const loadMemories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setMemories(data || []);
    } catch (error) {
      console.error('Error loading memories:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateQueueInfo = () => {
    setQueueInfo({
      length: audioQueue.getQueueLength(),
      playing: audioQueue.getCurrentlyPlaying(),
    });
  };

  const clearAllMemories = async () => {
    if (!confirm('Are you sure you want to delete ALL memories? This cannot be undone!')) {
      return;
    }
    try {
      const { error } = await supabase.from('memories').delete().neq('id', '');
      if (error) throw error;
      toast.success('All memories deleted');
      loadMemories();
    } catch (error) {
      console.error('Error deleting memories:', error);
      toast.error('Failed to delete memories');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-black border-2 border-white">
        <CardHeader className="flex-shrink-0 border-b border-white">
          <div className="flex items-center justify-between">
            <CardTitle className="font-terminal text-white text-xl">
              &gt; DEV_PORTAL.EXE
            </CardTitle>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white hover:text-black"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Location Info */}
          <div className="font-terminal text-white space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>&gt; LOCATION:</span>
            </div>
            {userLocation ? (
              <div className="pl-6 text-sm">
                <div>Lat: {userLocation.lat.toFixed(6)}</div>
                <div>Lng: {userLocation.lng.toFixed(6)}</div>
                {userLocation.accuracy && <div>Accuracy: ±{Math.round(userLocation.accuracy)}m</div>}
              </div>
            ) : (
              <div className="pl-6 text-sm text-gray-400">No location data</div>
            )}
          </div>

          {/* User Info */}
          <div className="font-terminal text-white space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>&gt; USER_ID:</span>
            </div>
            <div className="pl-6 text-sm">{userId || 'Not logged in'}</div>
          </div>

          {/* Audio Queue Info */}
          <div className="font-terminal text-white space-y-2">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              <span>&gt; AUDIO_QUEUE:</span>
            </div>
            <div className="pl-6 text-sm">
              <div>Queue Length: {queueInfo.length}</div>
              {queueInfo.playing && (
                <div>Currently Playing: {queueInfo.playing.memory?.summary || 'Unknown'}</div>
              )}
            </div>
          </div>

          {/* Memories List */}
          <div className="font-terminal text-white space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span>&gt; MEMORIES ({memories.length}):</span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={loadMemories}
                  variant="outline"
                  size="sm"
                  className="font-terminal text-white border-white hover:bg-white hover:text-black"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button
                  onClick={clearAllMemories}
                  variant="outline"
                  size="sm"
                  className="font-terminal text-red-400 border-red-400 hover:bg-red-400 hover:text-black"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </div>
            <div className="pl-6 space-y-2 max-h-64 overflow-y-auto">
              {loading ? (
                <div className="text-sm text-gray-400">Loading...</div>
              ) : memories.length === 0 ? (
                <div className="text-sm text-gray-400">No memories found</div>
              ) : (
                memories.map((memory) => (
                  <div key={memory.id} className="text-sm border-b border-gray-700 pb-2">
                    <div className="font-semibold">{memory.summary || 'No summary'}</div>
                    <div className="text-gray-400 text-xs">
                      {memory.place_name} | {memory.audio_url ? 'Has audio' : 'No audio'} | 
                      Created: {new Date(memory.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

