// Adventure Data - Migrated from SwiftUI AdventureData.swift
// Contains detailed adventure information for the expandable interface

export enum AdventureDifficulty {
  BEGINNER = "Beginner",
  INTERMEDIATE = "Intermediate", 
  ADVANCED = "Advanced"
}

export interface LearningModule {
  id: number
  title: string
  description?: string
}

export interface Adventure {
  id: number
  title: string
  subtitle: string
  description: string
  era: string
  difficulty: AdventureDifficulty
  estimatedTime: string
  modules: LearningModule[]
  prerequisites: string[]
  heroImageName?: string
  iconName: string
  thumbnailImageName?: string
  backgroundColor: string
  tags: string[]
  historicalPeriod: string
  geographicRegion: string
  keyFigures: string[]
  isFeature: boolean
  sortOrder: number
  xpReward: number
}

// EXACT migration from SwiftUI AdventureData.swift
export const AdventureData = {
  sampleAdventures: [
    {
      id: 1,
      title: "Damascus - The New Capital",
      subtitle: "The Heart of Empire",
      description: "Discover how Damascus became the center of the Islamic world under Caliph Muʿawiya I.",
      era: "Umayyad Dynasty",
      difficulty: AdventureDifficulty.BEGINNER,
      estimatedTime: "25 min",
      modules: [
        { id: 1, title: "Choosing Damascus", description: "Learn why Muʿawiya chose Damascus as his capital" },
        { id: 2, title: "Building the Capital", description: "Explore how Damascus grew into a magnificent city" },
        { id: 3, title: "Life in the Capital", description: "Experience daily life in the Umayyad capital" }
      ],
      prerequisites: [],
      heroImageName: "Adventure-1-bg",
      iconName: "building.columns.fill",
      thumbnailImageName: "damascus-thumb",
      backgroundColor: "PersianOrange",
      tags: ["Capital", "Politics", "Architecture"],
      historicalPeriod: "661-680 CE",
      geographicRegion: "Damascus, Syria",
      keyFigures: ["Muʿawiya I"],
      isFeature: true,
      sortOrder: 1,
      xpReward: 100
    },
    {
      id: 2,
      title: "Abd al-Malik's Reforms",
      subtitle: "Unifying the Empire",
      description: "Explore the groundbreaking reforms that transformed the Umayyad Empire.",
      era: "Umayyad Dynasty",
      difficulty: AdventureDifficulty.INTERMEDIATE,
      estimatedTime: "30 min",
      modules: [
        { id: 1, title: "New Currency System", description: "Learn about the revolutionary Arabic coins" },
        { id: 2, title: "The Dome of the Rock", description: "Discover this architectural masterpiece" },
        { id: 3, title: "Arabic as Official Language", description: "See how language unified the empire" }
      ],
      prerequisites: ["Damascus - The New Capital"],
      heroImageName: "Adventure-2-bg",
      iconName: "scroll.fill",
      thumbnailImageName: "reforms-thumb",
      backgroundColor: "MutedNavy",
      tags: ["Reform", "Language", "Architecture"],
      historicalPeriod: "685-705 CE",
      geographicRegion: "Jerusalem, Damascus",
      keyFigures: ["Abd al-Malik ibn Marwan"],
      isFeature: false,
      sortOrder: 2,
      xpReward: 150
    },
    {
      id: 3,
      title: "Westward Expansion",
      subtitle: "Conquest of Al-Andalus",
      description: "Follow the Umayyad conquest of North Africa and Spain.",
      era: "Umayyad Dynasty",
      difficulty: AdventureDifficulty.INTERMEDIATE,
      estimatedTime: "35 min",
      modules: [
        { id: 1, title: "Crossing to Morocco", description: "The conquest begins in North Africa" },
        { id: 2, title: "The Battle of Gibraltar", description: "Tariq ibn Ziyad's historic crossing" },
        { id: 3, title: "Establishing Al-Andalus", description: "Building Islamic civilization in Spain" }
      ],
      prerequisites: ["Abd al-Malik's Reforms"],
      heroImageName: "Adventure-3-bg",
      iconName: "arrow.up.right.circle.fill",
      thumbnailImageName: "expansion-thumb",
      backgroundColor: "PersianOrange",
      tags: ["Conquest", "Military", "Expansion"],
      historicalPeriod: "711-718 CE",
      geographicRegion: "Morocco, Spain",
      keyFigures: ["Tariq ibn Ziyad", "Musa ibn Nusayr"],
      isFeature: false,
      sortOrder: 3,
      xpReward: 200
    },
    {
      id: 4,
      title: "Great Mosque of Damascus",
      subtitle: "Byzantine Artistry in Islamic Architecture",
      description: "Discover how Byzantine mosaic artists created sparkling paradise landscapes in the heart of the Islamic world.",
      era: "Umayyad Dynasty",
      difficulty: AdventureDifficulty.INTERMEDIATE,
      estimatedTime: "30 min",
      modules: [
        { id: 1, title: "Mosaic Masterpieces", description: "Marvel at shimmering landscapes made of tiny Byzantine tiles" },
        { id: 2, title: "Desert Palaces", description: "Discover how comfort and elegance bloomed in the desert" },
        { id:3, title: "Sacred Spaces", description: "Explore how art transforms worship and community" }
      ],
      prerequisites: ["Westward Expansion"],
      heroImageName: "Adventure-4-bg",
      iconName: "star.fill",
      thumbnailImageName: "mosque-mosaics-thumb",
      backgroundColor: "PersianOrange",
      tags: ["Art", "Architecture", "Collaboration"],
      historicalPeriod: "705-715 CE",
      geographicRegion: "Damascus, Syria",
      keyFigures: ["Al-Walid I", "Byzantine Artists"],
      isFeature: false,
      sortOrder: 4,
      xpReward: 250
    },
    {
      id: 5,
      title: "Coming Soon",
      subtitle: "Future Adventures Await",
      description: "More exciting adventures in Umayyad history are coming soon! Stay tuned for new stories and discoveries.",
      era: "Umayyad Dynasty",
      difficulty: AdventureDifficulty.INTERMEDIATE,
      estimatedTime: "TBD",
      modules: [
        { id: 1, title: "Coming Soon", description: "Future content awaits" },
        { id: 2, title: "Coming Soon", description: "Future content awaits" },
        { id: 3, title: "Coming Soon", description: "Future content awaits" }
      ],
      prerequisites: ["Great Mosque of Damascus"],
      heroImageName: "Adventure-5-bg",
      iconName: "star.fill",
      thumbnailImageName: "coming-soon-thumb",
      backgroundColor: "MutedNavy",
      tags: ["Future", "Coming Soon"],
      historicalPeriod: "TBD",
      geographicRegion: "TBD",
      keyFigures: ["TBD"],
      isFeature: false,
      sortOrder: 5,
      xpReward: 0
    }
  ] as Adventure[],

  getAdventure: (id: number): Adventure | undefined => {
    return AdventureData.sampleAdventures.find(adventure => adventure.id === id)
  },

  // Get adventure long descriptions - migrated from SwiftUI getAdventureLongDescription()
  getAdventureLongDescription: (id: number): string => {
    switch (id) {
      case 1:
        return "Long ago, the city of Damascus became the capital of a powerful empire! In this adventure, you'll find out how Caliph Muʿawiya chose Damascus as his new center of rule. You'll see how the city grew with grand buildings, busy markets, and important leaders who helped make big decisions. From its beautiful palaces to the lively streets, Damascus became a place where ideas, goods, and cultures came together - like a giant meeting point of the ancient world!"
      case 2:
        return "Join Caliph Abd al-Malik as he transforms the Islamic empire! You'll discover how he created new coins with Arabic writing, built the magnificent Dome of the Rock in Jerusalem, and made Arabic the official language of government. These weren't just small changes - they were bold moves that helped unite a vast empire under one identity. Get ready to explore how smart leadership and clear communication can shape the future of entire civilizations!"
      case 3:
        return "Follow the Umayyad armies as they march across North Africa and into Spain! You'll witness epic battles, meet brave generals like Tariq ibn Ziyad, and see how Islamic civilization spread from the Atlantic Ocean to the heart of Europe. From the conquest of Morocco to the crossing into Al-Andalus (Spain), this adventure shows how courage, strategy, and determination can change the map of the world forever!"
      case 4:
        return "Step inside the Great Mosque of Damascus and discover its sparkling Byzantine mosaics! You'll learn how the Umayyads invited skilled artists from their former rival empire to create breathtaking paradise landscapes. These weren't just decorations - they were dreamlike scenes of gardens and flowing water that made worshippers feel peaceful and connected to the divine. See how art can bring together different cultures to create something truly beautiful!"
      case 5:
        return "More amazing adventures in Umayyad history are on their way! We're working hard to bring you new stories, characters, and discoveries that will take you even deeper into this fascinating time period. Stay tuned for updates and get ready to explore more of the Islamic world's golden age!"
      default:
        return "Embark on an exciting journey through Islamic history! Discover the stories, people, and places that shaped the Umayyad Dynasty in this interactive adventure."
    }
  }
}