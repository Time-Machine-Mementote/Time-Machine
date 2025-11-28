// Secret Code Window Component
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SecretCodeWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SecretCodeWindow({ isOpen, onClose }: SecretCodeWindowProps) {
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code === '4734') {
      navigate('/map');
      setCode('');
      onClose();
    } else {
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
              &gt; ENTER_SECRET_CODE
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
              <label htmlFor="secret-code" className="font-terminal text-white text-sm block">
                &gt; CODE:
              </label>
              <input
                id="secret-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-black border border-white text-white font-terminal px-3 py-2 focus:outline-none focus:border-white"
                autoFocus
                placeholder="Enter code..."
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-white text-black font-terminal hover:bg-white hover:text-black border-2 border-white"
            >
              &gt; SUBMIT
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

