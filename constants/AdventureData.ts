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
      default:
        return "Embark on an exciting journey through Islamic history! Discover the stories, people, and places that shaped the Umayyad Dynasty in this interactive adventure."
    }
  }
}