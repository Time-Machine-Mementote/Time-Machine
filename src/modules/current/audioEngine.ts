// The Current: Audio engine for ambient loops and speech playback

import { synthesizeSpeech } from './ttsClient';

// Simple audio player using Web Audio API or HTML5 Audio
class AudioPlayer {
  private ambientAudio: HTMLAudioElement | null = null;
  private speechAudio: HTMLAudioElement | null = null;
  private isPlaying = false;

  /**
   * Play ambient audio for a segment (fades out previous, fades in new)
   */
  async playAmbientForSegment(segmentSlug: string, ambientUrl: string | null): Promise<void> {
    // Fade out current ambient if playing
    if (this.ambientAudio && this.isPlaying) {
      await this.fadeOut(this.ambientAudio, 1000);
      this.ambientAudio.pause();
      this.ambientAudio = null;
    }

    // If no ambient URL provided, just stop
    if (!ambientUrl) {
      return;
    }

    // Create new audio element
    const audio = new Audio(ambientUrl);
    audio.loop = true;
    audio.volume = 0;

    // Fade in
    audio.play().catch((error) => {
      console.error('Failed to play ambient audio:', error);
    });

    // Fade in over 2 seconds
    const fadeInInterval = setInterval(() => {
      if (audio.volume < 0.3) {
        audio.volume = Math.min(audio.volume + 0.05, 0.3);
      } else {
        clearInterval(fadeInInterval);
      }
    }, 100);

    this.ambientAudio = audio;
    this.isPlaying = true;
  }

  /**
   * Speak a line using TTS
   */
  async speakLine(line: string, options?: { voiceSlug?: string }): Promise<void> {
    // Stop any current speech
    if (this.speechAudio) {
      this.speechAudio.pause();
      this.speechAudio = null;
    }

    try {
      console.log('🎤 Speaking line:', line.substring(0, 50) + '...');
      
      // Get audio URL from TTS
      const audioUrl = await synthesizeSpeech(line, {
        voiceSlug: options?.voiceSlug,
      });

      console.log('✅ Got audio URL:', audioUrl.substring(0, 50) + '...');

      // Play the audio
      const audio = new Audio(audioUrl);
      audio.volume = 0.8;
      audio.preload = 'auto';

      // Add event listeners for debugging
      audio.addEventListener('loadstart', () => console.log('🔊 Audio loading...'));
      audio.addEventListener('loadeddata', () => console.log('✅ Audio data loaded'));
      audio.addEventListener('canplay', () => console.log('✅ Audio can play'));
      audio.addEventListener('canplaythrough', () => console.log('✅ Audio can play through'));
      audio.addEventListener('error', (e) => {
        console.error('❌ Audio error:', e, audio.error, audio.error?.code, audio.error?.message);
      });

      // Wait for audio to be ready
      await new Promise<void>((resolve, reject) => {
        const onCanPlay = () => {
          audio.removeEventListener('canplay', onCanPlay);
          audio.removeEventListener('error', onError);
          resolve();
        };
        
        const onError = (error: Event) => {
          audio.removeEventListener('canplay', onCanPlay);
          audio.removeEventListener('error', onError);
          console.error('❌ Audio load error:', error, audio.error);
          reject(new Error(`Audio load failed: ${audio.error?.message || 'Unknown error'}`));
        };

        if (audio.readyState >= 2) {
          // Already loaded
          resolve();
        } else {
          audio.addEventListener('canplay', onCanPlay);
          audio.addEventListener('error', onError);
          audio.load(); // Start loading
        }
      });

      // Now play the audio
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          console.log('✅ Audio finished playing');
          resolve();
        };
        audio.onerror = (error) => {
          console.error('❌ Audio playback error:', error, audio.error);
          reject(new Error(`Audio playback failed: ${audio.error?.message || 'Unknown error'}`));
        };
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('▶️ Audio started playing');
            })
            .catch((playError) => {
              console.error('❌ Audio play() failed:', playError);
              reject(playError);
            });
        } else {
          // Fallback for older browsers
          resolve();
        }
      });

      this.speechAudio = audio;
    } catch (error) {
      console.error('❌ Failed to speak line:', error);
      
      // Fallback to browser TTS
      console.log('🔄 Falling back to browser TTS...');
      try {
        const { synthesizeSpeechNative } = await import('./ttsClient');
        await synthesizeSpeechNative(line, {
          languageCode: 'en-US',
          speed: 1.0,
        });
        console.log('✅ Browser TTS completed');
      } catch (fallbackError) {
        console.error('❌ Browser TTS also failed:', fallbackError);
        // Don't throw - just log and continue
      }
    }
  }

  /**
   * Stop all audio
   */
  stop(): void {
    if (this.ambientAudio) {
      this.ambientAudio.pause();
      this.ambientAudio = null;
    }
    if (this.speechAudio) {
      this.speechAudio.pause();
      this.speechAudio = null;
    }
    this.isPlaying = false;
  }

  /**
   * Fade out audio
   */
  private fadeOut(audio: HTMLAudioElement, duration: number): Promise<void> {
    return new Promise((resolve) => {
      const startVolume = audio.volume;
      const startTime = Date.now();

      const fadeInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;

        if (progress >= 1) {
          audio.volume = 0;
          clearInterval(fadeInterval);
          resolve();
        } else {
          audio.volume = startVolume * (1 - progress);
        }
      }, 50);
    });
  }
}

// Singleton instance
const audioPlayer = new AudioPlayer();

/**
 * Play ambient audio for a segment
 */
export function playAmbientForSegment(segmentSlug: string, ambientUrl: string | null): Promise<void> {
  return audioPlayer.playAmbientForSegment(segmentSlug, ambientUrl);
}

/**
 * Speak a line using TTS
 */
export function speakLine(line: string, options?: { voiceSlug?: string }): Promise<void> {
  return audioPlayer.speakLine(line, options);
}

/**
 * Stop all audio
 */
export function stopAllAudio(): void {
  audioPlayer.stop();
}

