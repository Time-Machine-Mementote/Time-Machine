// Add Memory Sheet Component
import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Send, Loader2 } from 'lucide-react';
import { processMemoryText } from '@/services/memoryApi';
import { toast } from 'sonner';
import type { UserLocation } from '@/types/memory';
import VoiceInput from '@/components/VoiceInput';

interface AddMemorySheetProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation: UserLocation | null;
  userId?: string;
}

export function AddMemorySheet({ isOpen, onClose, userLocation, userId }: AddMemorySheetProps) {
  const [text, setText] = useState('');
  const [privacy, setPrivacy] = useState<'private' | 'friends' | 'public'>('public');
  const [radius, setRadius] = useState([30]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!text.trim()) {
      toast.error('Please enter some text for your memory');
      return;
    }

    if (!userLocation) {
      toast.error('Location not available. Please enable location services.');
      return;
    }

    if (!userId) {
      toast.error('Please sign in to create memories');
      return;
    }

    setIsProcessing(true);

    try {
      await processMemoryText(
        text.trim(),
        userLocation.lat,
        userLocation.lng,
        userId,
        privacy
      );

      toast.success('Memory created successfully!');
      setText('');
      onClose();
    } catch (error) {
      console.error('Failed to create memory:', error);
      toast.error('Failed to create memory. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceTranscription = (transcribedText: string) => {
    // Append or replace text with transcription
    if (text.trim()) {
      setText(text + ' ' + transcribedText);
    } else {
      setText(transcribedText);
    }
    toast.success('Voice transcription completed!');
  };

  const handleVoiceError = (error: string) => {
    toast.error(error);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setText(clipboardText);
      toast.success('Text pasted from clipboard');
    } catch (error) {
      toast.error('Failed to read from clipboard');
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] max-h-[90vh] flex flex-col">
        <SheetHeader className="flex-shrink-0 pb-4">
          <SheetTitle>Add Memory</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-1 -mx-1">
          <form onSubmit={handleSubmit} className="space-y-6 mt-6 pb-8">
          {/* Location Info */}
          {userLocation && (
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                📍 Location: {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
              </p>
              <p className="text-xs text-green-600">
                Accuracy: ±{Math.round(userLocation.accuracy || 0)}m
              </p>
            </div>
          )}

          {/* Text Input */}
          <div className="space-y-2">
            <Label htmlFor="memory-text">Memory Text</Label>
            <Textarea
              id="memory-text"
              placeholder="Describe your memory... (e.g., 'Oct 2, 2025 when Cory and I saw the world through the Time Machine at the Campanile')"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[100px]"
              disabled={isProcessing}
            />
          </div>

          {/* Voice Input */}
          <div className="space-y-3">
            <Label>Quick Input Methods</Label>
            <VoiceInput
              onTranscriptionComplete={handleVoiceTranscription}
              onError={handleVoiceError}
              disabled={isProcessing}
            />
            
            <Button
              type="button"
              variant="outline"
              onClick={handlePasteFromClipboard}
              disabled={isProcessing}
              className="w-full"
            >
              📋 Paste from Clipboard
            </Button>
          </div>

          {/* Privacy Setting */}
          <div className="space-y-2">
            <Label htmlFor="privacy">Privacy</Label>
            <Select value={privacy} onValueChange={(value: 'private' | 'friends' | 'public') => setPrivacy(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">🌍 Public - Anyone can hear</SelectItem>
                <SelectItem value="friends">👥 Friends - Only friends can hear</SelectItem>
                <SelectItem value="private">🔒 Private - Only you can hear</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Radius Setting */}
          <div className="space-y-2">
            <Label htmlFor="radius">Trigger Radius: {radius[0]}m</Label>
            <Slider
              value={radius}
              onValueChange={setRadius}
              max={100}
              min={10}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Audio will play when someone enters this radius around your memory location
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isProcessing || !text.trim() || !userLocation}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Memory...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Create Memory
              </>
            )}
          </Button>
          </form>

          {/* Help Text */}
          <div className="mt-6 p-3 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Tips for better memories:</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Include specific places (e.g., "Campanile", "Memorial Glade")</li>
              <li>• Mention dates or times (e.g., "Oct 2, 2025", "last spring")</li>
              <li>• Include people's names</li>
              <li>• Keep it personal and meaningful</li>
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
