// GameGeneratorService.ts - AI-powered game content generation
// Uses Gemini to create dynamic puzzle games on-demand

import { aiService } from './AIService';
import type {
  GameType,
  GameDifficulty,
  JigsawGameData,
  TimelineGameData,
  WordSearchGameData,
  PatternGameData,
  GameGenerationRequest,
} from '@/types/games';
import { DIFFICULTY_SETTINGS } from '@/types/games';

class GameGeneratorService {
  /**
   * Generate game content based on request
   */
  async generateGame(request: GameGenerationRequest): Promise<JigsawGameData | TimelineGameData | WordSearchGameData | PatternGameData> {
    console.log(`🎮 [GameGenerator] Generating ${request.type} game for topic: ${request.topic}`);

    switch (request.type) {
      case 'jigsaw':
        return this.generateJigsawGame(request);
      case 'timeline':
        return this.generateTimelineGame(request);
      case 'wordsearch':
        return this.generateWordSearchGame(request);
      case 'pattern':
        return this.generatePatternGame(request);
      default:
        throw new Error(`Unknown game type: ${request.type}`);
    }
  }

  /**
   * Generate Jigsaw Puzzle
   */
  private async generateJigsawGame(request: GameGenerationRequest): Promise<JigsawGameData> {
    const gridSize = DIFFICULTY_SETTINGS.jigsaw[request.difficulty].gridSize;

    console.log(`🧩 [GameGenerator] Generating ${gridSize}x${gridSize} jigsaw puzzle for: ${request.topic}`);

    // Generate AI image for the puzzle
    const imageUrl = await this.findHistoricalImage(request.topic);

    // Generate piece data
    // For MVP: All pieces use the same full image with CSS cropping via Image component
    // TODO: Implement server-side image cropping or use canvas to create actual piece images
    const pieces = [];
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        pieces.push({
          id: `piece-${row}-${col}`,
          correctPosition: { row, col },
          currentPosition: null,
          // Use full image for now - piece cropping happens via CSS positioning
          imageUri: imageUrl,
        });
      }
    }

    console.log(`✅ [GameGenerator] Created ${pieces.length} puzzle pieces`);

    return {
      type: 'jigsaw',
      difficulty: request.difficulty,
      imageUrl,
      gridSize,
      pieces,
      topic: request.topic,
    };
  }

  /**
   * Generate Timeline Puzzle
   */
  private async generateTimelineGame(request: GameGenerationRequest): Promise<TimelineGameData> {
    const eventCount = DIFFICULTY_SETTINGS.timeline[request.difficulty].eventCount;

    const prompt = `Generate ${eventCount} historical events about "${request.topic}" for a timeline puzzle game.

Return a JSON array with this exact format:
[
  {
    "title": "Event name (max 60 characters)",
    "date": "Year in CE format (e.g., '750 CE' or '820-833 CE')",
    "timestamp": year as number (e.g., 750),
    "description": "Brief 1-sentence description"
  }
]

Requirements:
- Events must be in chronological order
- Dates must be historically accurate
- Keep descriptions concise and educational
- Events should be significant milestones

Return ONLY the JSON array, no other text.`;

    try {
      const response = await aiService.getChatResponse({
        userMessage: prompt,
        conversationHistory: [],
      });

      // Parse AI response
      const events = JSON.parse(response);

      return {
        type: 'timeline',
        difficulty: request.difficulty,
        events: events.map((e: any, index: number) => ({
          id: `event-${index}`,
          ...e,
        })),
        topic: request.topic,
      };
    } catch (error) {
      console.error('❌ [GameGenerator] Error generating timeline:', error);
      throw new Error('Failed to generate timeline game');
    }
  }

  /**
   * Generate Word Search Puzzle
   */
  private async generateWordSearchGame(request: GameGenerationRequest): Promise<WordSearchGameData> {
    const { gridSize, wordCount } = DIFFICULTY_SETTINGS.wordsearch[request.difficulty];

    const prompt = `Generate ${wordCount} historically accurate terms about "${request.topic}" for a word search puzzle.

Return a JSON object with this exact format:
{
  "words": ["term1", "term2", ...],
  "grid": [
    ["A", "B", "C", ...],
    ["D", "E", "F", ...],
    ...
  ]
}

Requirements:
- ${wordCount} terms related to ${request.topic}
- Each word: 4-12 letters, uppercase
- Grid: ${gridSize}x${gridSize} matrix of uppercase letters
- Words can be horizontal, vertical, or diagonal
- Fill empty spaces with random letters

Return ONLY the JSON object, no other text.`;

    try {
      const response = await aiService.getChatResponse({
        userMessage: prompt,
        conversationHistory: [],
      });

      const data = JSON.parse(response);

      return {
        type: 'wordsearch',
        difficulty: request.difficulty,
        grid: data.grid,
        words: data.words.map((word: string, index: number) => ({
          word,
          found: false,
        })),
        topic: request.topic,
      };
    } catch (error) {
      console.error('❌ [GameGenerator] Error generating word search:', error);
      throw new Error('Failed to generate word search game');
    }
  }

  /**
   * Generate Pattern Matching Puzzle
   */
  private async generatePatternGame(request: GameGenerationRequest): Promise<PatternGameData> {
    const gridSize = DIFFICULTY_SETTINGS.pattern[request.difficulty].gridSize;

    // Pattern matching uses Islamic geometric patterns
    // For MVP, use placeholder pattern images
    const completedPattern = 'https://via.placeholder.com/400x400.png?text=Islamic+Pattern';

    const tiles = [];
    const totalTiles = gridSize * gridSize;
    const patternCount = Math.ceil(totalTiles / 4); // 4 tiles per pattern group

    for (let i = 0; i < totalTiles; i++) {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;
      const patternId = `pattern-${Math.floor(i / 4)}`;

      tiles.push({
        id: `tile-${i}`,
        patternId,
        imageUrl: `https://via.placeholder.com/100x100.png?text=Tile+${i}`,
        rotation: (i % 4) * 90 as (0 | 90 | 180 | 270),
        position: null,
      });
    }

    return {
      type: 'pattern',
      difficulty: request.difficulty,
      gridSize,
      tiles,
      completedPattern,
      topic: request.topic,
    };
  }

  /**
   * Generate a historical image for the topic using Gemini AI
   *
   * PERFORMANCE NOTE: AI image generation takes 5-10 seconds
   * For faster testing, set USE_AI_IMAGES = false to use instant placeholders
   */
  private async findHistoricalImage(topic: string): Promise<string> {
    const USE_AI_IMAGES = true; // Set to true to enable AI generation (slower but better quality)

    if (!USE_AI_IMAGES) {
      // Fast mode: Use beautiful historical placeholder images
      console.log(`🖼️ [GameGenerator] Using placeholder image for: ${topic}`);
      // Using a high-quality historical architecture placeholder
      return 'https://picsum.photos/seed/' + encodeURIComponent(topic) + '/400/400';
    }

    console.log(`🖼️ [GameGenerator] Generating AI image for topic: ${topic}`);

    try {
      // Build prompt for historically accurate jigsaw puzzle image
      const imagePrompt = this.buildJigsawImagePrompt(topic);

      // Call Gemini Image Generation API (takes 5-10 seconds)
      const imageResult = await aiService.generateImage({
        prompt: imagePrompt,
        context: {
          eraName: topic,
        },
      });

      if (imageResult) {
        // Convert base64 image to data URI for React Native Image component
        const dataUri = `data:${imageResult.mimeType};base64,${imageResult.imageBase64}`;
        console.log('✅ [GameGenerator] AI image generated successfully');
        return dataUri;
      } else {
        console.warn('⚠️ [GameGenerator] No image returned from AI, using placeholder');
        return 'https://picsum.photos/seed/' + encodeURIComponent(topic) + '/400/400';
      }
    } catch (error) {
      console.error('❌ [GameGenerator] Error generating AI image:', error);
      // Fallback to placeholder on error
      return 'https://picsum.photos/seed/' + encodeURIComponent(topic) + '/400/400';
    }
  }

  /**
   * Build optimized prompt for jigsaw puzzle images
   * Specifically for Islamic history educational content
   */
  private buildJigsawImagePrompt(topic: string): string {
    return `Create a beautiful, detailed historical scene about "${topic}" from Islamic and Middle Eastern history.

ISLAMIC HISTORY CONTEXT:
- Show historically accurate Islamic architecture, landscapes, or cultural scenes
- Could include: mosques, palaces, markets, gardens, libraries, observatories
- Architectural styles: Islamic geometric patterns, domes, minarets, courtyards, arches
- Geographic regions: Arabia, Levant, North Africa, Al-Andalus, Persia
- No depiction of prophets or religious figures (follow Islamic artistic guidelines)
- Focus on architectural beauty, cultural achievements, and historical settings

REQUIREMENTS FOR JIGSAW PUZZLE:
- High visual clarity and detail (suitable for cutting into puzzle pieces)
- Rich colors and strong contrast between elements
- Clear architectural or landscape features
- No text or calligraphy overlays (no Arabic text visible)
- Balanced composition with interesting visual elements throughout
- Historically accurate Islamic architectural elements
- Educational and visually engaging for children and families

VISUAL STYLE:
- Painterly realism with warm, natural lighting
- Clear forms and edges (important for puzzle cutting)
- Detailed Islamic geometric patterns and textures
- Vibrant but historically authentic colors (blues, golds, earth tones)
- Architectural grandeur and cultural richness

Generate a single high-quality image suitable for a jigsaw puzzle game about Islamic history.`;
  }

  /**
   * Validate generated game data
   */
  private validateGameData(gameData: any): boolean {
    // Add validation logic here
    return true;
  }
}

// Export singleton instance
export const gameGeneratorService = new GameGeneratorService();