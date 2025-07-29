export interface MediaFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  file?: File;
}

export interface JournalEntryFormData {
  title: string;
  content: string;
  type: 'text' | 'voice' | 'media';
  audioBlob?: string;
  mediaFiles?: MediaFile[];
} 