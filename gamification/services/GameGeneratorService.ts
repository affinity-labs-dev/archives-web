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
} from '@/gamification/types/games';
import { DIFFICULTY_SETTINGS } from '@/gamification/types/games';

// Era-specific puzzle themes with rich contextual details
interface PuzzleTheme {
  name: string;
  details: string;
  era: string;
}

// Use Supabase era_id values as keys (matches actual database values)
const ERA_THEMES: Record<string, PuzzleTheme[]> = {
  // Legacy Era 1 - Umayyad Dynasty
  era_1: [
    {
      name: 'The Great Mosque of Damascus',
      details: 'The magnificent courtyard of the Umayyad Mosque in Damascus, featuring the iconic minaret, marble columns, and intricate Byzantine-influenced mosaics with geometric patterns',
      era: 'Umayyad Dynasty (661-750 CE)',
    },
    {
      name: 'Cordoba Mezquita Construction',
      details: 'The grand Mosque-Cathedral of Córdoba during Umayyad Al-Andalus, showing the famous horseshoe arches, red and white striped voussoirs, and forest of columns',
      era: 'Umayyad Dynasty (661-750 CE)',
    },
    {
      name: 'Damascus Souq Al-Hamidiyah',
      details: 'The bustling covered market of Damascus with its distinctive vaulted ceiling, merchants selling spices and silk, traditional architecture and vibrant trade activity',
      era: 'Umayyad Dynasty (661-750 CE)',
    },
    {
      name: 'Dome of the Rock',
      details: 'The stunning golden Dome of the Rock in Jerusalem with its octagonal structure, intricate Islamic geometric tile work, and the surrounding Noble Sanctuary plaza',
      era: 'Umayyad Dynasty (661-750 CE)',
    },
  ],
  // Era 2 - Abbasid Dynasty (use actual Supabase era_id)
  era_2: [
    {
      name: 'Baghdad House of Wisdom',
      details: 'The legendary Bayt al-Hikma library and translation center in Baghdad, with scholars studying manuscripts, astronomical instruments, and towering bookshelves filled with knowledge',
      era: 'Abbasid Dynasty (750-1258 CE)',
    },
    {
      name: 'Round City of Baghdad',
      details: 'The circular design of Baghdad founded by Al-Mansur, showing the concentric walls, four gates aligned with cardinal directions, and the central palace complex',
      era: 'Abbasid Dynasty (750-1258 CE)',
    },
    {
      name: 'Samarra Great Mosque',
      details: 'The massive Great Mosque of Samarra with its iconic spiral minaret (Malwiya Tower), vast prayer hall, and the distinctive helical design towering over the city',
      era: 'Abbasid Dynasty (750-1258 CE)',
    },
    {
      name: 'Islamic Golden Age Observatory',
      details: 'An Abbasid-era astronomical observatory with scholars using astrolabes, celestial globes, and intricate mathematical instruments to study the stars',
      era: 'Abbasid Dynasty (750-1258 CE)',
    },
  ],
  // Rise of Islam Era (use actual Supabase era_id)
  era_rise_of_islam: [
    {
      name: 'Cave of Hira',
      details: 'The sacred Cave of Hira on Mount Jabal al-Nour near Mecca, with rocky mountain terrain, the small cave entrance, and the view of the desert valley below',
      era: 'Rise of Islam (570-661 CE)',
    },
    {
      name: 'Early Medina Cityscape',
      details: 'The oasis city of Medina with palm groves, the Prophet\'s Mosque in its original simple form, mud-brick houses, and the community gathering in the courtyard',
      era: 'Rise of Islam (570-661 CE)',
    },
    {
      name: 'Meccan Trade Caravan',
      details: 'A merchant caravan approaching Mecca with camels loaded with goods, desert landscape, the city in the distance, and traders in traditional 7th century Arabian dress',
      era: 'Rise of Islam (570-661 CE)',
    },
    {
      name: 'First Mosque (Quba)',
      details: 'The historic Quba Mosque near Medina, the first mosque built in Islamic history, with its simple architectural design, courtyard, and palm trees surrounding it',
      era: 'Rise of Islam (570-661 CE)',
    },
  ],
  // Fallback themes when no era matches
  generic: [
    {
      name: 'Islamic Gardens and Architecture',
      details: 'Beautiful traditional Islamic paradise gardens with geometric water channels, fountains, cypress trees, and elegant palace architecture',
      era: 'Islamic History',
    },
    {
      name: 'Historic Markets and Trade Routes',
      details: 'Vibrant traditional souq with merchants, colorful textiles, spices, pottery, and the bustling atmosphere of Islamic trade centers',
      era: 'Islamic History',
    },
    {
      name: 'Islamic Geometric Patterns',
      details: 'Intricate Islamic geometric patterns, arabesques, and tilework adorning mosque walls, featuring complex mathematical designs and vibrant colors',
      era: 'Islamic History',
    },
    {
      name: 'Desert Oasis Settlement',
      details: 'A lush oasis in the Arabian desert with palm trees, water features, traditional architecture, and the contrast of green vegetation against sandy dunes',
      era: 'Islamic History',
    },
  ],
};

// Variety modifiers to prevent repetitive images
const VARIETY_MODIFIERS = {
  timeOfDay: [
    'at dawn with soft morning light',
    'during golden hour with warm sunset colors',
    'at midday with bright, clear lighting',
    'in the late afternoon with long shadows',
    'during blue hour with dramatic twilight',
  ],
  weather: [
    'under clear blue skies',
    'with dramatic clouds in the sky',
    'with soft diffused natural lighting',
    'with golden atmospheric haze',
  ],
  perspective: [
    'from a wide ground-level view',
    'from an elevated perspective',
    'showing architectural details up close',
    'with a sweeping panoramic composition',
  ],
  season: [
    'in spring with blooming vegetation',
    'in autumn with warm earth tones',
    'with lush greenery',
  ],
};

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
    // Use override gridSize if provided (for intelligent difficulty scaling), otherwise use difficulty mapping
    const gridSize = request.gridSize || DIFFICULTY_SETTINGS.jigsaw[request.difficulty].gridSize;

    console.log(`🧩 [GameGenerator] Generating ${gridSize}x${gridSize} jigsaw puzzle for: ${request.topic}`);

    // Generate AI image for the puzzle with contextual era data from Supabase
    const eraId = request.userCompletedEras && request.userCompletedEras.length > 0
      ? request.userCompletedEras[0]
      : undefined;

    const imageUrl = await this.findHistoricalImage(request.topic, eraId);

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

    // Generate unique ID for this puzzle (for React key)
    const puzzleId = `puzzle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      type: 'jigsaw',
      difficulty: request.difficulty,
      imageUrl,
      gridSize,
      pieces,
      topic: request.topic,
      id: puzzleId,
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
      const events = JSON.parse(response.text);

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

      const data = JSON.parse(response.text);

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
   * Generate a historical image for the topic using backend AI
   * Uses contextual era-based themes if user progress is provided
   *
   * PERFORMANCE NOTE: AI image generation takes 5-10 seconds
   * For faster testing, set USE_AI_IMAGES = false to use instant placeholders
   */
  private async findHistoricalImage(topic: string, eraId?: string): Promise<string> {
    const USE_AI_IMAGES = true;

    if (!USE_AI_IMAGES) {
      return 'https://picsum.photos/seed/' + encodeURIComponent(topic) + '/400/400';
    }

    try {
      const varietyModifiers = this.generateVarietyModifiers();
      const imagePrompt = this.buildEraContextualPrompt(topic, null, varietyModifiers);

      const imageResult = await aiService.generateImage({
        prompt: imagePrompt,
        context: { eraName: eraId || topic },
      });

      if (imageResult) {
        return `data:${imageResult.mimeType};base64,${imageResult.imageBase64}`;
      }

      return 'https://picsum.photos/seed/' + encodeURIComponent(topic) + '/400/400';
    } catch (error) {
      console.error('❌ [GameGenerator] Error generating AI image:', error);
      return 'https://picsum.photos/seed/' + encodeURIComponent(topic) + '/400/400';
    }
  }

  /**
   * Select contextual theme based on user's completed eras
   */
  private selectContextualTheme(userCompletedEras?: string[]): PuzzleTheme {
    let availableThemes: PuzzleTheme[] = [];

    // If user has completed eras, use their era_id values directly from Supabase
    if (userCompletedEras && userCompletedEras.length > 0) {
      for (const eraId of userCompletedEras) {
        // Use era_id directly as key (e.g., 'era_1', 'era_2', 'era_rise_of_islam')
        if (ERA_THEMES[eraId]) {
          availableThemes.push(...ERA_THEMES[eraId]);
          console.log(`🎨 [GameGenerator] Added themes from: ${eraId}`);
        } else {
          console.warn(`⚠️ [GameGenerator] No themes found for era_id: ${eraId}`);
        }
      }
    }

    // Fallback to generic themes if no completed eras or no matching themes
    if (availableThemes.length === 0) {
      console.log('🎨 [GameGenerator] Using generic themes (no completed eras)');
      availableThemes = ERA_THEMES.generic;
    }

    // Randomly select a theme
    const randomIndex = Math.floor(Math.random() * availableThemes.length);
    return availableThemes[randomIndex];
  }

  /**
   * Generate random variety modifiers to prevent repetitive images
   */
  private generateVarietyModifiers(): string {
    const timeOfDay = VARIETY_MODIFIERS.timeOfDay[Math.floor(Math.random() * VARIETY_MODIFIERS.timeOfDay.length)];
    const weather = VARIETY_MODIFIERS.weather[Math.floor(Math.random() * VARIETY_MODIFIERS.weather.length)];
    const perspective = VARIETY_MODIFIERS.perspective[Math.floor(Math.random() * VARIETY_MODIFIERS.perspective.length)];

    // Randomly decide whether to include season (50% chance)
    const includeSeason = Math.random() > 0.5;
    const season = includeSeason
      ? VARIETY_MODIFIERS.season[Math.floor(Math.random() * VARIETY_MODIFIERS.season.length)]
      : '';

    return `${timeOfDay}, ${weather}, ${perspective}${season ? `, ${season}` : ''}`;
  }

  /**
   * Build era-contextual prompt for jigsaw puzzle images
   * Era context is now resolved by the backend; this builds the generic puzzle prompt
   */
  private buildEraContextualPrompt(topic: string, _eraData: null, varietyModifiers: string): string {
    return `Create a beautiful, detailed historical scene about "${topic}" from Islamic and Middle Eastern history, ${varietyModifiers}.

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
- Painterly realism with natural lighting as specified
- Clear forms and edges (important for puzzle cutting)
- Detailed Islamic geometric patterns and textures
- Vibrant but historically authentic colors (blues, golds, earth tones)
- Architectural grandeur and cultural richness

Generate a single high-quality image suitable for a jigsaw puzzle game about Islamic history.`;
  }

  private buildJigsawImagePrompt(topic: string, themeDetails?: string, varietyModifiers?: string): string {
    // DEPRECATED: This method is kept for backward compatibility
    // Use buildEraContextualPrompt instead for dynamic Supabase-driven prompts

    // If we have theme details (from era-based selection), use rich contextual prompt
    if (themeDetails && varietyModifiers) {
      return `Create a beautiful, highly detailed historical scene: ${themeDetails}, ${varietyModifiers}.

ISLAMIC HISTORY CONTEXT:
- Show historically accurate Islamic architecture, landscapes, or cultural scenes
- No depiction of prophets or religious figures (follow Islamic artistic guidelines)
- Focus on architectural beauty, cultural achievements, and historical settings
- Geographic accuracy for the time period and region

REQUIREMENTS FOR JIGSAW PUZZLE:
- High visual clarity and detail (suitable for cutting into puzzle pieces)
- Rich colors and strong contrast between elements
- Clear architectural or landscape features
- No text or calligraphy overlays (no Arabic text visible)
- Balanced composition with interesting visual elements throughout
- Historically accurate Islamic architectural elements
- Educational and visually engaging for children and families

VISUAL STYLE:
- Painterly realism with natural lighting as specified
- Clear forms and edges (important for puzzle cutting)
- Detailed Islamic geometric patterns and textures
- Vibrant but historically authentic colors (blues, golds, earth tones)
- Architectural grandeur and cultural richness

Generate a single high-quality image suitable for a jigsaw puzzle game about Islamic history.`;
    }

    // Fallback to original generic prompt if no theme details
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