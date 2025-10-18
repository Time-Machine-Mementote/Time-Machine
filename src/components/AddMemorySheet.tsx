// Add Memory Sheet Component
import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Mic, MicOff, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { UserLocation } from '@/types/memory';

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
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [placeName, setPlaceName] = useState('');
  const [summary, setSummary] = useState('');
  const [useCustomLocation, setUseCustomLocation] = useState(false);
  const [customLat, setCustomLat] = useState('');
  const [customLng, setCustomLng] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!text.trim()) {
      toast.error('Please enter some text for your memory');
      return;
    }

    if (!placeName.trim()) {
      toast.error('Please enter a place name');
      return;
    }

    setIsProcessing(true);

    try {
      // Determine which location to use
      let finalLat: number;
      let finalLng: number;
      
      if (useCustomLocation && customLat && customLng) {
        finalLat = parseFloat(customLat);
        finalLng = parseFloat(customLng);
        
        if (isNaN(finalLat) || isNaN(finalLng)) {
          toast.error('Please enter valid latitude and longitude coordinates');
          return;
        }
      } else if (userLocation) {
        finalLat = userLocation.lat;
        finalLng = userLocation.lng;
      } else {
        finalLat = 37.8721; // Default to Berkeley campus
        finalLng = -122.2585;
      }

      // Create a simple memory record directly in Supabase
      const { data, error } = await supabase
        .from('memories')
        .insert({
          text: text.trim(),
          lat: finalLat,
          lng: finalLng,
          place_name: placeName.trim(),
          privacy: privacy,
          summary: summary.trim() || text.trim().substring(0, 100) + '...',
          radius_m: radius[0],
          author_id: userId || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Memory created successfully:', data);
      toast.success('Memory created successfully!');
      
      // Reset form
      setText('');
      setPlaceName('');
      setSummary('');
      setRadius([30]);
      setPrivacy('public');
      setUseCustomLocation(false);
      setCustomLat('');
      setCustomLng('');
      
      // Close the sheet
      onClose();
      
      // Refresh the page to show the new memory
      window.location.reload();
      
    } catch (error) {
      console.error('Failed to create memory:', error);
      toast.error('Failed to create memory. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecordingToggle = () => {
    setIsRecording(!isRecording);
    // TODO: Implement voice recording with Web Speech API
    if (!isRecording) {
      toast.info('Voice recording not yet implemented');
    }
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
          {userLocation ? (
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                📍 Location: {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
              </p>
              <p className="text-xs text-green-600">
                Accuracy: ±{Math.round(userLocation.accuracy || 0)}m
              </p>
            </div>
          ) : (
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                📍 Using default Berkeley campus location
              </p>
              <p className="text-xs text-yellow-600">
                You can manually set coordinates below
              </p>
            </div>
          )}

          {/* Location Override */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="use-custom-location"
                checked={useCustomLocation}
                onChange={(e) => setUseCustomLocation(e.target.checked)}
                disabled={isProcessing}
                className="rounded"
              />
              <Label htmlFor="use-custom-location" className="text-sm font-medium">
                Use custom location instead of current location
              </Label>
            </div>
            
            {useCustomLocation && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="custom-lat" className="text-xs">Latitude</Label>
                  <Input
                    id="custom-lat"
                    type="number"
                    step="any"
                    placeholder="37.8721"
                    value={customLat}
                    onChange={(e) => setCustomLat(e.target.value)}
                    disabled={isProcessing}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="custom-lng" className="text-xs">Longitude</Label>
                  <Input
                    id="custom-lng"
                    type="number"
                    step="any"
                    placeholder="-122.2585"
                    value={customLng}
                    onChange={(e) => setCustomLng(e.target.value)}
                    disabled={isProcessing}
                    className="text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-blue-600">
                    💡 Tip: You can get coordinates from Google Maps by right-clicking on a location
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Place Name Input */}
          <div className="space-y-2">
            <Label htmlFor="place-name">Place Name *</Label>
            <Input
              id="place-name"
              placeholder="e.g., Campanile, Memorial Glade, Doe Library"
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              disabled={isProcessing}
              required
            />
          </div>

          {/* Text Input */}
          <div className="space-y-2">
            <Label htmlFor="memory-text">Memory Text *</Label>
            <Textarea
              id="memory-text"
              placeholder="Describe your memory... (e.g., 'Had coffee with friends at the campus cafe')"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[100px]"
              disabled={isProcessing}
              required
            />
          </div>

          {/* Summary Input */}
          <div className="space-y-2">
            <Label htmlFor="summary">Summary (optional)</Label>
            <Input
              id="summary"
              placeholder="Short summary of your memory"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              disabled={isProcessing}
            />
            <p className="text-xs text-gray-500">
              If left empty, will use first 100 characters of your memory text
            </p>
          </div>

          {/* Input Methods */}
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleRecordingToggle}
              disabled={isProcessing}
              className={isRecording ? 'bg-red-100 text-red-700' : ''}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {isRecording ? 'Stop' : 'Record'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handlePasteFromClipboard}
              disabled={isProcessing}
            >
              📋 Paste
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
                <SelectItem value="public">🌍 Public - Anyone can see</SelectItem>
                <SelectItem value="friends">👥 Friends - Only friends can see</SelectItem>
                <SelectItem value="private">🔒 Private - Only you can see</SelectItem>
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
              This radius will be shown around your memory marker on the map
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isProcessing || !text.trim() || !placeName.trim()}
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
