// Ghost Debug Panel Component
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface GhostDebugPanelProps {
  supabaseUrl: string | undefined;
  supabaseAnonKey: string | undefined;
  userId: string | undefined;
  queryStatus: 'idle' | 'loading' | 'success' | 'error';
  queryError: string | null;
  memoriesCount: number;
  previewStatus: 'idle' | 'loading' | 'playing' | 'error';
  previewError: string | null;
  previewLocation: { lat: number; lng: number } | null;
}

export function GhostDebugPanel({
  supabaseUrl,
  supabaseAnonKey,
  userId,
  queryStatus,
  queryError,
  memoriesCount,
  previewStatus,
  previewError,
  previewLocation,
}: GhostDebugPanelProps) {
  const maskString = (str: string | undefined, visibleChars: number = 6): string => {
    if (!str) return 'MISSING';
    if (str.length <= visibleChars) return str;
    return str.substring(0, visibleChars) + '...';
  };

  return (
    <Card className="bg-black border-2 border-cyan-500">
      <CardHeader className="pb-2">
        <CardTitle className="font-terminal text-cyan-400 text-sm">
          &gt; GHOST_DEBUG_PANEL
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs font-mono">
        {/* Supabase Config */}
        <div className="space-y-1">
          <div className="text-cyan-400 font-bold">Supabase Config:</div>
          <div className="pl-2 space-y-1 text-white">
            <div className="flex items-center gap-2">
              {supabaseUrl ? (
                <CheckCircle className="h-3 w-3 text-green-400" />
              ) : (
                <XCircle className="h-3 w-3 text-red-400" />
              )}
              <span>URL: {maskString(supabaseUrl)}</span>
            </div>
            <div className="flex items-center gap-2">
              {supabaseAnonKey ? (
                <CheckCircle className="h-3 w-3 text-green-400" />
              ) : (
                <XCircle className="h-3 w-3 text-red-400" />
              )}
              <span>Anon Key: {maskString(supabaseAnonKey)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>User ID: {userId || 'anon'}</span>
            </div>
          </div>
        </div>

        {/* Query Status */}
        <div className="space-y-1">
          <div className="text-cyan-400 font-bold">Query Status:</div>
          <div className="pl-2 space-y-1 text-white">
            <div className="flex items-center gap-2">
              {queryStatus === 'loading' && <Loader2 className="h-3 w-3 text-yellow-400 animate-spin" />}
              {queryStatus === 'success' && <CheckCircle className="h-3 w-3 text-green-400" />}
              {queryStatus === 'error' && <XCircle className="h-3 w-3 text-red-400" />}
              {queryStatus === 'idle' && <AlertCircle className="h-3 w-3 text-gray-400" />}
              <span className="capitalize">{queryStatus}</span>
            </div>
            {queryError && (
              <div className="pl-5 text-red-400 text-xs break-all">
                Error: {queryError}
              </div>
            )}
            <div className="pl-5 text-gray-400">
              Memories: {memoriesCount}
            </div>
          </div>
        </div>

        {/* Preview Status */}
        <div className="space-y-1">
          <div className="text-cyan-400 font-bold">Preview Audio:</div>
          <div className="pl-2 space-y-1 text-white">
            <div className="flex items-center gap-2">
              {previewStatus === 'loading' && <Loader2 className="h-3 w-3 text-yellow-400 animate-spin" />}
              {previewStatus === 'playing' && <CheckCircle className="h-3 w-3 text-green-400" />}
              {previewStatus === 'error' && <XCircle className="h-3 w-3 text-red-400" />}
              {previewStatus === 'idle' && <AlertCircle className="h-3 w-3 text-gray-400" />}
              <span className="capitalize">{previewStatus}</span>
            </div>
            {previewError && (
              <div className="pl-5 text-red-400 text-xs break-all">
                Error: {previewError}
              </div>
            )}
            {previewLocation && (
              <div className="pl-5 text-gray-400">
                Location: {previewLocation.lat.toFixed(4)}, {previewLocation.lng.toFixed(4)}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

