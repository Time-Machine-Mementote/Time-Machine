import { useState, useEffect, useMemo } from 'react';
import { Search, Clock, Heart, Shuffle, Calendar, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { databaseService } from '@/services/databaseService';
import type { Database } from '@/integrations/supabase/types';

type JournalEntry = Database['public']['Tables']['journal_entries']['Row'] & {
  generated_memory?: Database['public']['Tables']['generated_memories']['Row'];
};
import MemoryCard from '@/components/MemoryCard';

const TakeMeBack = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'favorites' | 'text' | 'voice' | 'media'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Load entries on component mount
  useEffect(() => {
    const loadEntries = async () => {
      try {
        const allEntries = await databaseService.getJournalEntriesWithMemories();
        setEntries(allEntries);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading entries:', error);
        setIsLoading(false);
      }
    };

    loadEntries();
  }, []);

  // Filter and search entries
  const filteredAndSearchedEntries = useMemo(() => {
    let filtered = entries;

    // Apply filter
    switch (selectedFilter) {
      case 'favorites':
        // TODO: Add favorite filtering when implemented
        filtered = filtered.filter(entry => false);
        break;
      case 'text':
      case 'voice':
      case 'media':
        filtered = filtered.filter(entry => entry.entry_type === selectedFilter);
        break;
      default:
        break;
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.title.toLowerCase().includes(query) ||
        entry.content.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [entries, selectedFilter, searchQuery]);

  const handleRandomMemory = () => {
    if (entries.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * entries.length);
    const randomEntry = entries[randomIndex];
    
    // For now, just show the random entry
    // TODO: Add recall tracking to database
    console.log('Random memory selected:', randomEntry);
  };

  const handleToggleFavorite = async (entryId: string) => {
    // TODO: Add favorite functionality to database
    console.log('Toggle favorite for entry:', entryId);
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'voice': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'media': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your memories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-crimson font-bold text-foreground mb-4">
          Take Me Back
        </h1>
        <p className="text-lg text-muted-foreground mb-6">
          Search through your memories and relive your most cherished moments
        </p>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="take me back to..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="time-input pl-12 pr-4 py-4 text-lg"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        {/* Filters */}
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All', icon: Calendar },
              { key: 'favorites', label: 'Favorites', icon: Heart },
              { key: 'text', label: 'Text', icon: Clock },
              { key: 'voice', label: 'Voice', icon: Clock },
              { key: 'media', label: 'Media', icon: Clock },
            ].map(filter => (
              <Button
                key={filter.key}
                variant={selectedFilter === filter.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter(filter.key as any)}
                className="text-xs"
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Random Memory Button */}
        <Button
          onClick={handleRandomMemory}
          variant="outline"
          className="flex items-center gap-2 hover:scale-105 transition-transform"
          disabled={entries.length === 0}
        >
          <Shuffle className="w-4 h-4" />
          Random Memory
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{entries.length}</p>
          <p className="text-sm text-muted-foreground">Total Memories</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-secondary">0</p>
          <p className="text-sm text-muted-foreground">Favorites</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-accent">{entries.filter(e => e.generated_memory).length}</p>
          <p className="text-sm text-muted-foreground">AI Stories</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">0</p>
          <p className="text-sm text-muted-foreground">Total Recalls</p>
        </div>
      </div>

      {/* Results */}
      {filteredAndSearchedEntries.length === 0 ? (
        <div className="text-center py-12">
          {entries.length === 0 ? (
            <div className="glass-card p-8 max-w-md mx-auto">
              <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-crimson font-semibold text-foreground mb-2">
                No Memories Yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Start creating memories by writing your first journal entry
              </p>
              <Button 
                onClick={() => window.location.href = '/journal'}
                className="btn-ethereal"
              >
                Create Your First Memory
              </Button>
            </div>
          ) : (
            <div className="glass-card p-8 max-w-md mx-auto">
              <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-crimson font-semibold text-foreground mb-2">
                No Memories Found
              </h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSearchedEntries.map((entry) => (
            <MemoryCard
              key={entry.id}
              entry={entry}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TakeMeBack;