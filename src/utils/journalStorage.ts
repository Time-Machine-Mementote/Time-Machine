export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'voice' | 'media';
  timestamp: number;
  audioBlob?: string; // Base64 encoded audio
  mediaFiles?: MediaFile[];
  memoryGenerated?: boolean;
  memory?: GeneratedMemory;
  generatedMemory?: GeneratedMemory;
  recallCount?: number;
  isFavorite?: boolean;
}

export interface MediaFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // Base64 encoded
  preview?: string;
  url?: string;
  file?: File;
}

export interface GeneratedMemory {
  id: string;
  entryId: string;
  title?: string;
  story: string;
  audioUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  createdAt: string;
  generatedAt?: number;
}

const STORAGE_KEY = 'timeMachine_journalEntries';

export const journalStorage = {
  // Get all journal entries
  getEntries(): JournalEntry[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading journal entries:', error);
      return [];
    }
  },

  // Save a journal entry
  saveEntry(entry: Omit<JournalEntry, 'id' | 'timestamp'>): JournalEntry {
    const newEntry: JournalEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      recallCount: 0,
      isFavorite: false,
    };

    const entries = this.getEntries();
    entries.unshift(newEntry); // Add to beginning for chronological order
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      return newEntry;
    } catch (error) {
      console.error('Error saving journal entry:', error);
      throw new Error('Failed to save journal entry');
    }
  },

  // Update an existing entry
  updateEntry(id: string, updates: Partial<JournalEntry>): void {
    const entries = this.getEntries();
    const index = entries.findIndex(entry => entry.id === id);
    
    if (index !== -1) {
      entries[index] = { ...entries[index], ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      } catch (error) {
        console.error('Error updating journal entry:', error);
        throw new Error('Failed to update journal entry');
      }
    }
  },

  // Delete an entry
  deleteEntry(id: string): void {
    const entries = this.getEntries().filter(entry => entry.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error('Error deleting journal entry:', error);
      throw new Error('Failed to delete journal entry');
    }
  },

  // Get entry by ID
  getEntry(id: string): JournalEntry | undefined {
    return this.getEntries().find(entry => entry.id === id);
  },

  // Search entries
  searchEntries(query: string): JournalEntry[] {
    const entries = this.getEntries();
    const searchTerm = query.toLowerCase();
    
    return entries.filter(entry =>
      entry.title.toLowerCase().includes(searchTerm) ||
      entry.content.toLowerCase().includes(searchTerm)
    );
  },

  // Get favorites
  getFavorites(): JournalEntry[] {
    return this.getEntries().filter(entry => entry.isFavorite);
  },

  // Get entries with memories
  getEntriesWithMemories(): JournalEntry[] {
    return this.getEntries().filter(entry => entry.memoryGenerated && entry.memory);
  },

  // Increment recall count
  incrementRecall(id: string): void {
    const entry = this.getEntry(id);
    if (entry) {
      this.updateEntry(id, { 
        recallCount: (entry.recallCount || 0) + 1 
      });
    }
  },

  // Toggle favorite
  toggleFavorite(id: string): void {
    const entry = this.getEntry(id);
    if (entry) {
      this.updateEntry(id, { 
        isFavorite: !entry.isFavorite 
      });
    }
  },

  // Clear all entries (for debugging)
  clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
};