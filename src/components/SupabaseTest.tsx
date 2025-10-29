import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const SupabaseTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [memories, setMemories] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Test basic connection
        const { data, error } = await supabase
          .from('memories')
          .select('*')
          .limit(5);

        if (error) {
          if (import.meta.env.DEV) console.error('Supabase error:', error);
          setError(error.message);
          setConnectionStatus('error');
        } else {
          setMemories(data || []);
          setConnectionStatus('connected');
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('Connection test failed:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setConnectionStatus('error');
      }
    };

    testConnection();
  }, []);

  return (
    <div className="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg border z-50 max-w-sm">
      <h3 className="font-semibold text-lg mb-2">Supabase Integration Test</h3>
      
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            connectionStatus === 'checking' ? 'bg-yellow-400' :
            connectionStatus === 'connected' ? 'bg-green-400' : 'bg-red-400'
          }`} />
          <span className="text-sm">
            {connectionStatus === 'checking' ? 'Checking...' :
             connectionStatus === 'connected' ? 'Connected' : 'Error'}
          </span>
        </div>

        {error && (
          <div className="text-red-600 text-xs">
            Error: {error}
          </div>
        )}

        {connectionStatus === 'connected' && (
          <div className="text-green-600 text-xs">
            Found {memories.length} memories in database
          </div>
        )}

        {memories.length > 0 && (
          <div className="text-xs text-gray-600">
            <div className="font-medium">Sample memories:</div>
            {memories.slice(0, 2).map((memory, index) => (
              <div key={memory.id} className="truncate">
                {index + 1}. {memory.text?.substring(0, 50)}...
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
