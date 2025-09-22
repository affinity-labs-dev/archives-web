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
      title: "The Abbasid Revolution",
      subtitle: "Revolution & New Order",
      description: "Discover how the Abbasids overthrew the Umayyads and built Baghdad as their magnificent capital.",
      era: "Umayyad Dynasty",
      difficulty: AdventureDifficulty.INTERMEDIATE,
      estimatedTime: "45 minutes",
      modules: [
        { id: 1, title: "Yazīd II's Reign", description: "Explore the final years of Umayyad cultural achievement under Caliph Yazīd II" },
        { id: 2, title: "Revolutionary Strategy", description: "Learn how the Abbasids used propaganda and symbols to build their movement" },
        { id: 3, title: "Revolution & New Order", description: "Witness the 750 CE takeover and the founding of Baghdad as the new capital" }
      ],
      prerequisites: ["Great Mosque of Damascus"],
      heroImageName: "Adventure-5-bg",
      iconName: "flag.fill",
      thumbnailImageName: "abbasid-revolution-thumb",
      backgroundColor: "ShoeBrown",
      tags: ["Revolution", "Politics", "Capital Cities"],
      historicalPeriod: "720-750 CE",
      geographicRegion: "Iraq & Syria",
      keyFigures: ["Yazīd II", "al-Mansur", "Abbasid Leaders"],
      isFeature: false,
      sortOrder: 5,
      xpReward: 150
    },
    {
      id: 6,
      title: "ROIERA2Adv1",
      subtitle: "570-610 CE: Before the Call",
      description: "Explore the early life of Prophet Muhammad, from his birth in Mecca to his life as a merchant before receiving his prophetic mission.",
      era: "Rise of Islam",
      difficulty: AdventureDifficulty.BEGINNER,
      estimatedTime: "25 min",
      modules: [
        { id: 1, title: "Meccan Life & Tribal Culture", description: "Explore the culture, trade, and tribal loyalties of pre-Islamic Mecca" },
        { id: 2, title: "Growing Up in Mecca", description: "Discover his youth and development in Arabian society" },
        { id: 3, title: "The Merchant Years", description: "Follow his career as a trusted merchant and marriage to Khadijah" }
      ],
      prerequisites: [],
      heroImageName: "Adventure-6-bg",
      iconName: "person.fill",
      thumbnailImageName: "early-years-thumb",
      backgroundColor: "PersianOrange",
      tags: ["Biography", "Mecca", "Early Life"],
      historicalPeriod: "570-610 CE",
      geographicRegion: "Mecca, Arabian Peninsula",
      keyFigures: ["Muhammad", "Khadijah", "Abu Talib"],
      isFeature: true,
      sortOrder: 6,
      xpReward: 100
    },
    {
      id: 7,
      title: "ROIERA2Adv2",
      subtitle: "610-613 CE: The Call to Prophethood",
      description: "Experience the pivotal moment when Muhammad received his first revelation and began his prophetic mission in secret.",
      era: "Rise of Islam",
      difficulty: AdventureDifficulty.BEGINNER,
      estimatedTime: "30 min",
      modules: [
        { id: 1, title: "The Cave of Hira", description: "Witness the first revelation in the cave where Muhammad meditated" },
        { id: 2, title: "The First Believers", description: "Meet the earliest converts to Islam, starting with Khadijah" },
        { id: 3, title: "Secret Preaching", description: "Understand the early, private phase of spreading the message" }
      ],
      prerequisites: ["The Early Years"],
      heroImageName: "Adventure-7-bg",
      iconName: "book.fill",
      thumbnailImageName: "first-revelations-thumb",
      backgroundColor: "MutedNavy",
      tags: ["Revelation", "Prophethood", "Early Islam"],
      historicalPeriod: "610-613 CE",
      geographicRegion: "Mecca, Cave of Hira",
      keyFigures: ["Muhammad", "Angel Gabriel", "Khadijah", "Ali", "Abu Bakr"],
      isFeature: false,
      sortOrder: 7,
      xpReward: 150
    },
    {
      id: 8,
      title: "ROIERA2Adv3",
      subtitle: "622 CE: Migration to Medina",
      description: "Follow the historic migration from Mecca to Medina that marks the beginning of the Islamic calendar.",
      era: "Rise of Islam",
      difficulty: AdventureDifficulty.INTERMEDIATE,
      estimatedTime: "35 min",
      modules: [
        { id: 1, title: "Persecution in Mecca", description: "Understand the growing opposition that led to the decision to migrate" },
        { id: 2, title: "The Journey to Medina", description: "Experience the dangerous journey across the Arabian desert" },
        { id: 3, title: "Welcome in Medina", description: "Discover how the Medinan community embraced the Muslim migrants" }
      ],
      prerequisites: ["First Revelations"],
      heroImageName: "Adventure-8-bg",
      iconName: "arrow.right.circle.fill",
      thumbnailImageName: "hijra-thumb",
      backgroundColor: "PersianOrange",
      tags: ["Migration", "Hijra", "Medina"],
      historicalPeriod: "622 CE",
      geographicRegion: "Mecca to Medina",
      keyFigures: ["Muhammad", "Abu Bakr", "Ansar", "Muhajirun"],
      isFeature: false,
      sortOrder: 8,
      xpReward: 200
    },
    {
      id: 9,
      title: "ROIERA2Adv4",
      subtitle: "622-630 CE: The Medinan Period",
      description: "Witness the establishment of the first Islamic state and community in Medina, including key battles and treaties.",
      era: "Rise of Islam",
      difficulty: AdventureDifficulty.INTERMEDIATE,
      estimatedTime: "40 min",
      modules: [
        { id: 1, title: "The Constitution of Medina", description: "Learn about the groundbreaking document that established the Islamic community" },
        { id: 2, title: "Key Battles", description: "Understand the defensive battles of Badr, Uhud, and the Trench" },
        { id: 3, title: "Treaty of Hudaybiyyah", description: "Explore the diplomatic breakthrough that secured peace with Mecca" }
      ],
      prerequisites: ["The Hijra"],
      heroImageName: "Adventure-9-bg",
      iconName: "building.2.fill",
      thumbnailImageName: "community-building-thumb",
      backgroundColor: "ShoeBrown",
      tags: ["Community", "Battles", "Diplomacy"],
      historicalPeriod: "622-630 CE",
      geographicRegion: "Medina, Arabian Peninsula",
      keyFigures: ["Muhammad", "Companions", "Jewish Tribes", "Byzantine Empire"],
      isFeature: false,
      sortOrder: 9,
      xpReward: 250
    },
    {
      id: 10,
      title: "ROIERA2Adv5",
      subtitle: "630-632 CE: Completion of the Mission",
      description: "Experience the final years of Prophet Muhammad's life, including the peaceful conquest of Mecca and the Farewell Pilgrimage.",
      era: "Rise of Islam",
      difficulty: AdventureDifficulty.INTERMEDIATE,
      estimatedTime: "35 minutes",
      modules: [
        { id: 1, title: "Conquest of Mecca", description: "Witness the peaceful return to Mecca and forgiveness of former enemies" },
        { id: 2, title: "The Farewell Pilgrimage", description: "Experience the final sermon and completion of Islamic teachings" },
        { id: 3, title: "The Succession", description: "Understand the immediate aftermath and the question of leadership" }
      ],
      prerequisites: ["Building the Community"],
      heroImageName: "Adventure-10-bg",
      iconName: "checkmark.seal.fill",
      thumbnailImageName: "final-years-thumb",
      backgroundColor: "MossGreen",
      tags: ["Conquest", "Pilgrimage", "Succession"],
      historicalPeriod: "630-632 CE",
      geographicRegion: "Mecca, Medina, Arabian Peninsula",
      keyFigures: ["Muhammad", "Abu Bakr", "Umar", "Ali", "Fatimah"],
      isFeature: false,
      sortOrder: 10,
      xpReward: 300
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
        return "Witness the end of an era and the birth of a new one! Follow the Abbasid revolutionaries as they use clever propaganda, powerful symbols, and strategic planning to overthrow the mighty Umayyad Dynasty. You'll see how they promised justice, appealed to religious devotion, and built a movement that would change Islamic history forever. Then watch as they create their magnificent new capital - Baghdad, the Round City - designed as a perfect circle to symbolize their vision of unity and order!"
      case 6:
        return "Journey back to 6th century Arabia and discover the remarkable early life of Prophet Muhammad! You'll explore ancient Mecca, learn about Arabian society, and follow the story of an orphaned boy who would grow up to become one of history's most influential figures. From his childhood with loving guardians to his reputation as an honest merchant, see how his character and experiences prepared him for his future calling as the final messenger of God."
      case 7:
        return "Experience one of history's most pivotal moments - the first revelation! You'll climb to the Cave of Hira where Muhammad meditated, witness the life-changing encounter with Angel Gabriel, and feel the weight of receiving the first verses of the Quran. Then discover how this incredible experience was shared with his beloved wife Khadijah and the first small group of believers who would form the foundation of the Islamic faith."
      case 8:
        return "Join the most important journey in Islamic history - the Hijra! Experience the growing persecution in Mecca, the secret planning of the migration, and the dangerous journey across the desert to Medina. You'll walk alongside Prophet Muhammad and his companion Abu Bakr as they risk everything for their faith, and witness the warm welcome they received from the people of Medina who would become the Ansar (helpers)."
      case 9:
        return "Watch history unfold as the first Islamic state takes shape in Medina! You'll witness the creation of the Constitution of Medina - a groundbreaking document that established rights and responsibilities for all citizens. Experience the community's growth through challenging times, including key defensive battles, and see how diplomacy and wisdom led to the Treaty of Hudaybiyyah that secured peace with Mecca."
      case 10:
        return "Experience the final chapter of Prophet Muhammad's remarkable life! Witness the peaceful conquest of Mecca where former enemies were forgiven with unprecedented mercy. Join the Farewell Pilgrimage where the final teachings were delivered to over 100,000 Muslims, and understand the deep questions about succession that would shape Islamic history for centuries to come."
      default:
        return "Embark on an exciting journey through Islamic history! Discover the stories, people, and places that shaped the Islamic world in this interactive adventure."
    }
  }
}