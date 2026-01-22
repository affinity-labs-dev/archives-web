// ElevenLabs Text-to-Speech Service (Simplified)
// Uses modern fetch API with data URI for cross-platform compatibility

const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

class ElevenLabsService {
  /**
   * Convert text to speech and return a data URI
   * @param text - The text to convert to speech
   * @param voiceId - ElevenLabs voice ID (default: Rachel)
   * @returns Data URI for the audio (playable directly)
   */
  async textToSpeech(
    text: string,
    voiceId: string = '21m00Tcm4TlvDq8ikWAM' // Rachel voice
  ): Promise<string | null> {
    console.log('🎤 [ElevenLabs] Starting TTS generation');
    console.log('   Text length:', text.length);
    console.log('   Voice ID:', voiceId);

    if (!ELEVENLABS_API_KEY) {
      console.error('❌ [ElevenLabs] API key not found');
      return null;
    }

    try {
      // Make API request
      console.log('🌐 [ElevenLabs] Calling API...');
      const response = await fetch(
        `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            output_format: 'mp3_44100_128',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      console.log('📡 [ElevenLabs] Response:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [ElevenLabs] API error:', response.status);
        console.error('   Error:', errorText);
        return null;
      }

      // Get audio as blob
      console.log('💾 [ElevenLabs] Converting to blob...');
      const blob = await response.blob();
      console.log('   Blob size:', blob.size, 'bytes');

      // Convert blob to base64
      console.log('🔄 [ElevenLabs] Converting to base64...');
      const base64 = await this.blobToBase64(blob);
      console.log('   Base64 length:', base64.length);

      // Create data URI
      const dataUri = `data:audio/mpeg;base64,${base64}`;
      console.log('✅ [ElevenLabs] Success! Data URI ready');

      return dataUri;
    } catch (error) {
      console.error('❌ [ElevenLabs] Error:', error);
      return null;
    }
  }

  /**
   * Convert Blob to base64 string
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        // Remove data:audio/mpeg;base64, prefix
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Strip HTML tags from text to get plain text for TTS
   */
  stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export default new ElevenLabsService();
