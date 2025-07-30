export interface MediaFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  file?: File;
  data: string; // Base64 encoded - required for compatibility
  preview?: string;
}

export interface JournalEntryFormData {
  title: string;
  content: string;
  type: 'text' | 'voice' | 'media';
  audioBlob?: string;
  mediaFiles?: MediaFile[];
} 