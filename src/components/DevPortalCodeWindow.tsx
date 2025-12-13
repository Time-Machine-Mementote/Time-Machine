// Dev Portal Code Window Component
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { setDevUnlocked } from '@/utils/devPortalUnlock';

interface DevPortalCodeWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DevPortalCodeWindow({ isOpen, onClose }: DevPortalCodeWindowProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (code === '4734') {
      // Unlock dev portal
      setDevUnlocked();
      setCode('');
      onClose();
      // Redirect to dev portal route
      navigate('/dev');
    } else {
      setError('Incorrect code.');
      setCode('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-black border-2 border-white">
        <CardHeader className="border-b border-white">
          <div className="flex items-center justify-between">
            <CardTitle className="font-terminal text-white text-xl">
              &gt; DEV_PORTAL_ACCESS
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
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="dev-portal-code" className="font-terminal text-white text-sm block">
                &gt; CODE:
              </label>
              <input
                id="dev-portal-code"
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError(null);
                }}
                className="w-full bg-black border border-white text-white font-terminal px-3 py-2 focus:outline-none focus:border-white"
                autoFocus
                placeholder="Enter 4-digit code..."
                maxLength={4}
                pattern="[0-9]*"
                inputMode="numeric"
              />
              {error && (
                <div className="text-red-400 font-terminal text-sm">
                  {error}
                </div>
              )}
            </div>
            <Button
              type="submit"
              className="w-full bg-white text-black font-terminal hover:bg-white hover:text-black border-2 border-white"
            >
              &gt; ENTER
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

