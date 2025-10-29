// Add Memory Sheet Component
import React, { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Mic, MicOff, Send, Loader2, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { UserLocation } from '@/types/memory';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// TypeScript declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

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
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mapPickerContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Simple name extraction function
  const extractNames = (text: string): string[] => {
    // Common name patterns - this is a simple implementation
    const namePatterns = [
      /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, // First Last
      /\b[A-Z][a-z]+(?: [A-Z][a-z]+)*\b/g, // Names starting with capital letters
    ];
    
    const names = new Set<string>();
    
    namePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Filter out common words that aren't names
          const commonWords = ['The', 'This', 'That', 'There', 'Then', 'They', 'When', 'Where', 'What', 'Why', 'How'];
          if (!commonWords.includes(match.split(' ')[0])) {
            names.add(match);
          }
        });
      }
    });
    
    return Array.from(names);
  };

  // Initialize map when map picker is shown
  useEffect(() => {
    if (!showMapPicker || !mapPickerContainer.current) return;

    const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!MAPBOX_TOKEN) {
      toast.error('Mapbox token not found');
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapPickerContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: userLocation ? [userLocation.lng, userLocation.lat] : [-122.2585, 37.8721],
      zoom: 15,
    });

    let marker: mapboxgl.Marker | null = null;

    // Add click handler to pick location
    map.current.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      setPickedLocation({ lat, lng });
      
      // Remove existing marker
      if (marker) {
        marker.remove();
      }
      
      // Add new marker at clicked location
      marker = new mapboxgl.Marker({
        color: '#ef4444', // Red color for the pin
        scale: 1.2
      })
        .setLngLat([lng, lat])
        .addTo(map.current!);
      
      toast.success(`Location picked: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    });

    return () => {
      if (marker) {
        marker.remove();
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [showMapPicker]); // Removed userLocation dependency to prevent constant re-renders

  // Clear picked location when map picker is closed
  useEffect(() => {
    if (!showMapPicker) {
      setPickedLocation(null);
    }
  }, [showMapPicker]);

  // Initialize speech recognition
  useEffect(() => {
    console.log('Initializing speech recognition...');
    console.log('webkitSpeechRecognition available:', 'webkitSpeechRecognition' in window);
    console.log('SpeechRecognition available:', 'SpeechRecognition' in window);
    
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      console.log('Creating SpeechRecognition instance');
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Update text with both final and interim results
        if (finalTranscript) {
          setText(prevText => prevText + finalTranscript);
          setIsTranscribing(false);
        } else if (interimTranscript) {
          setIsTranscribing(true);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        setIsTranscribing(false);
        
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. Please allow microphone access and try again.');
        } else if (event.error === 'no-speech') {
          toast.error('No speech detected. Please try again.');
        } else {
          toast.error(`Speech recognition error: ${event.error}`);
        }
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
        setIsTranscribing(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

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
      
      if (useCustomLocation && pickedLocation) {
        finalLat = pickedLocation.lat;
        finalLng = pickedLocation.lng;
      } else if (userLocation) {
        finalLat = userLocation.lat;
        finalLng = userLocation.lng;
      } else {
        finalLat = 37.8721; // Default to Berkeley campus
        finalLng = -122.2585;
      }

      // Extract names from the memory text
      const extractedNames = extractNames(text.trim());

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
          extracted_people: extractedNames,
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
      setShowMapPicker(false);
      setPickedLocation(null);
      
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
    console.log('handleRecordingToggle called', { isRecording, recognitionRef: recognitionRef.current });
    
    if (!recognitionRef.current) {
      console.log('Speech recognition not available');
      toast.error('Speech recognition is not supported in this browser. Please use Chrome or Safari.');
      return;
    }

    if (isRecording) {
      // Stop recording
      console.log('Stopping recording');
      recognitionRef.current.stop();
      setIsRecording(false);
      setIsTranscribing(false);
      toast.success('Recording stopped');
    } else {
      // Start recording
      console.log('Starting recording');
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        toast.success('Recording started - speak now!');
      } catch (error) {
        console.error('Failed to start recording:', error);
        toast.error('Failed to start recording. Please try again.');
      }
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
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowMapPicker(!showMapPicker)}
                  disabled={isProcessing}
                  className="w-full"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  {showMapPicker ? 'Hide Map Picker' : 'Pick Location on Map'}
                </Button>
                
                {pickedLocation && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">
                      📍 Picked Location: {pickedLocation.lat.toFixed(6)}, {pickedLocation.lng.toFixed(6)}
                    </p>
                  </div>
                )}
                
                {showMapPicker && (
                  <div className="h-64 border rounded-lg overflow-hidden">
                    <div ref={mapPickerContainer} className="w-full h-full" />
                  </div>
                )}
                
                <p className="text-xs text-blue-600">
                  💡 Click on the map to pick your desired location
                </p>
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
            {text.trim() && (
              <div className="p-2 bg-blue-50 rounded text-xs">
                <p className="text-blue-800 font-medium mb-1">Detected names:</p>
                {extractNames(text.trim()).length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {extractNames(text.trim()).map((name, index) => (
                      <span key={index} className="bg-blue-200 text-blue-800 px-2 py-1 rounded">
                        {name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-blue-600">No names detected</p>
                )}
              </div>
            )}
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
              className={`${isRecording ? 'bg-red-100 text-red-700 border-red-300' : ''} ${isTranscribing ? 'animate-pulse' : ''}`}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {isRecording ? (isTranscribing ? 'Listening...' : 'Stop') : 'Record Voice'}
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

          {/* Voice Recording Status */}
          {isRecording && (
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-800 flex items-center">
                <Mic className="h-4 w-4 mr-2" />
                {isTranscribing ? 'Listening and transcribing...' : 'Recording started - speak clearly!'}
              </p>
              <p className="text-xs text-red-600 mt-1">
                Click "Stop" when you're done speaking
              </p>
            </div>
          )}

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
