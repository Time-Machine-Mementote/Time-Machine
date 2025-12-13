import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Uploads an audio blob to Supabase storage
 * @param audioBlob - The audio blob to upload
 * @param memoryId - The memory ID to associate with this audio
 * @param userId - The user ID uploading the audio (optional for anonymous uploads)
 * @param isAnonymous - Whether this is an anonymous upload (uses public-input-only folder)
 * @returns The public URL of the uploaded audio file, or null if upload failed
 */
export async function uploadAudioToStorage(
  audioBlob: Blob,
  memoryId: string,
  userId?: string | null,
  isAnonymous: boolean = false
): Promise<string | null> {
  try {
    // Determine file extension and content type from blob mimeType
    const mimeType = audioBlob.type || 'audio/webm';
    let fileExt = 'webm';
    let contentType = 'audio/webm';
    
    if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
      fileExt = 'm4a';
      contentType = 'audio/mp4';
    } else if (mimeType.includes('webm')) {
      fileExt = 'webm';
      contentType = 'audio/webm';
    } else if (mimeType.includes('ogg')) {
      fileExt = 'ogg';
      contentType = 'audio/ogg';
    }
    
    const fileName = `${memoryId}_${Date.now()}.${fileExt}`;
    
    // For anonymous uploads, use public-input-only folder
    // For authenticated uploads, use userId folder
    const filePath = isAnonymous 
      ? `public-input-only/${fileName}`
      : `${userId || 'anonymous'}/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('audio-memories')
      .upload(filePath, audioBlob, {
        contentType: contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading audio:', uploadError);
      
      // If bucket doesn't exist, try to create it
      if (uploadError.message.includes('not found') || uploadError.message.includes('Bucket')) {
        toast.error('Audio storage bucket not configured. Please set up the audio-memories bucket in Supabase.');
      } else {
        toast.error(`Failed to upload audio: ${uploadError.message}`);
      }
      return null;
    }

    // Get public URL
    const { data } = supabase.storage
      .from('audio-memories')
      .getPublicUrl(filePath);

    if (!data?.publicUrl) {
      toast.error('Failed to get audio URL');
      return null;
    }

    return data.publicUrl;
  } catch (error) {
    console.error('Error in uploadAudioToStorage:', error);
    toast.error('Failed to upload audio file');
    return null;
  }
}

/**
 * Deletes an audio file from Supabase storage
 * @param fileUrl - The public URL of the file to delete
 * @returns true if deletion was successful, false otherwise
 */
export async function deleteAudioFromStorage(fileUrl: string): Promise<boolean> {
  try {
    // Extract file path from URL
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.indexOf('audio-memories');
    
    if (bucketIndex === -1 || bucketIndex === pathParts.length - 1) {
      console.error('Invalid audio URL format');
      return false;
    }
    
    const filePath = pathParts.slice(bucketIndex + 1).join('/');

    const { error } = await supabase.storage
      .from('audio-memories')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting audio:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteAudioFromStorage:', error);
    return false;
  }
}

