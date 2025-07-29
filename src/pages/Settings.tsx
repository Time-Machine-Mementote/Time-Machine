import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Key, Save, Eye, EyeOff } from 'lucide-react';

interface ApiKeys {
  openaiKey: string;
  runwareKey: string;
}

const Settings = () => {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    openaiKey: '',
    runwareKey: ''
  });
  const [showKeys, setShowKeys] = useState({
    openaiKey: false,
    runwareKey: false
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load existing API keys from localStorage
    const savedKeys = localStorage.getItem('timemashin_api_keys');
    if (savedKeys) {
      setApiKeys(JSON.parse(savedKeys));
    }
  }, []);

  const handleSave = async () => {
    if (!apiKeys.openaiKey || !apiKeys.runwareKey) {
      toast.error('Please provide both OpenAI and Runware API keys');
      return;
    }

    setIsSaving(true);
    try {
      // Store in localStorage for now (can be upgraded to Supabase later)
      localStorage.setItem('timemashin_api_keys', JSON.stringify(apiKeys));
      toast.success('API keys saved successfully');
    } catch (error) {
      toast.error('Failed to save API keys');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (key: keyof ApiKeys, value: string) => {
    setApiKeys(prev => ({ ...prev, [key]: value }));
  };

  const toggleVisibility = (key: keyof typeof showKeys) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent mb-4">
            Settings
          </h1>
          <p className="text-center text-muted-foreground">
            Configure your API keys to enable memory generation
          </p>
        </div>

        <Card className="backdrop-blur-lg bg-card/50 border-border/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              API Configuration
            </CardTitle>
            <CardDescription>
              Enter your API keys to enable AI-powered memory generation and image creation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="openai-key">OpenAI API Key</Label>
              <div className="relative">
                <Input
                  id="openai-key"
                  type={showKeys.openaiKey ? 'text' : 'password'}
                  value={apiKeys.openaiKey}
                  onChange={(e) => handleInputChange('openaiKey', e.target.value)}
                  placeholder="sk-..."
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => toggleVisibility('openaiKey')}
                >
                  {showKeys.openaiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Used for story generation and text-to-speech
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="runware-key">Runware API Key</Label>
              <div className="relative">
                <Input
                  id="runware-key"
                  type={showKeys.runwareKey ? 'text' : 'password'}
                  value={apiKeys.runwareKey}
                  onChange={(e) => handleInputChange('runwareKey', e.target.value)}
                  placeholder="rw-..."
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => toggleVisibility('runwareKey')}
                >
                  {showKeys.runwareKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Used for AI image generation
              </p>
            </div>

            <Button 
              onClick={handleSave} 
              disabled={isSaving || !apiKeys.openaiKey || !apiKeys.runwareKey}
              className="w-full"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save API Keys'}
            </Button>

            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium">Where to get your API keys:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>
                  <strong>OpenAI:</strong> Visit{' '}
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    platform.openai.com/api-keys
                  </a>
                </li>
                <li>
                  <strong>Runware:</strong> Visit{' '}
                  <a href="https://runware.ai/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    runware.ai
                  </a>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Settings;