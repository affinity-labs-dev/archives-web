# Umayyad Dynasty Content Data

This document contains the complete adventure data for the Umayyad Dynasty era. Use this to populate the `content` table in Supabase.

## Era Information

| Field | Value |
|-------|-------|
| `era_id` | `umayyad` |
| `name` | Umayyad Dynasty |
| `description` | The golden age of Islamic expansion (661-750 CE) |
| `timeline` | 661 - 750 CE |
| `order_by` | 1 |

---

## Adventure 1: The Rise of Damascus

### Metadata

| Field | Value |
|-------|-------|
| `readable_id` | `umayyad_adventure_1` |
| `era_id` | `umayyad` |
| `adventure_title` | The Rise of Damascus |
| `adventure_description` | You witnessed how Damascus became the heart of a new empire. |
| `timeline` | 661 - 680 CE |
| `adv_design` | `standard_6` |
| `order_by` | 1 |
| `icon_url` | `https://dzyjrzj2lngmg.cloudfront.net/Thumbnails/Adv1_Icon.png` |

### Card Content

```json
{
  "era_name": "Umayyad Dynasty",
  "map_image": "https://dzyjrzj2lngmg.cloudfront.net/Images/umayyad_map.png",
  "overview_text": "Discover how Mu'awiya transformed Damascus into the capital of a vast empire.",
  "estimated_time": "15 min",
  "adventure_story": "In 661 CE, Mu'awiya became the first Umayyad caliph and chose Damascus as his capital. Through the bay'ah ceremony, he united tribes and built the foundations of a dynasty that would stretch from Spain to India.",
  "background_image": "https://dzyjrzj2lngmg.cloudfront.net/Thumbnails/Adv1_Background.jpg"
}
```

### Content List (5 Lessons)

#### Lesson 1: The Bay'ah Ceremony (Reel)

```json
{
  "id": "media_1",
  "order_by": 1,
  "content_type": "reel",
  "media_url": ["https://dzyjrzj2lngmg.cloudfront.net/Reel+Videos/Adv1_M1_Reel1.mp4"],
  "thumbnail_url": "https://dzyjrzj2lngmg.cloudfront.net/Thumbnails/Adv1_M1_Thumb.jpg",
  "thumbnail_title": "The Bay'ah Ceremony",
  "bottom_content": {
    "reading_text": "<p>In 661 CE, Mu'awiya became the first Umayyad caliph and moved the capital to Damascus. He gained power through the bay'ah ceremony, where leaders and citizens pledged loyalty by placing their hands in his. This public act wasn't just symbolic – it showed unity and made his rule legitimate. From Damascus, Mu'awiya built the foundations of a new dynasty and a powerful center of leadership.</p>"
  },
  "questions": [
    {
      "question_text": "Which city did Mu'awiya designate as the new capital of the Islamic empire in 661 CE?",
      "question_type": "mcq",
      "explanation": "Mu'awiya designated Damascus as the new capital in 661 CE, marking the beginning of the Umayyad Dynasty and establishing Damascus as the center of Islamic power.",
      "answers": [
        { "text": "Medina", "is_correct": false },
        { "text": "Baghdad", "is_correct": false },
        { "text": "Damascus", "is_correct": true },
        { "text": "Cairo", "is_correct": false }
      ]
    },
    {
      "question_text": "What key geographic advantage made Damascus attractive as an imperial capital?",
      "question_type": "mcq",
      "explanation": "Damascus was strategically located at the crossroads of major trade routes and close to the Mediterranean, making it ideal for governing a vast empire and facilitating commerce.",
      "answers": [
        { "text": "Nile-delta access", "is_correct": false },
        { "text": "Crossroads of trade and close to the Mediterranean", "is_correct": true },
        { "text": "Desert isolation for defense", "is_correct": false },
        { "text": "An ancient royal palace was already there", "is_correct": false }
      ]
    },
    {
      "question_text": "Mu'awiya's legitimacy as caliph was formally affirmed through which ceremony?",
      "question_type": "mcq",
      "explanation": "The bay'ah ceremony was the formal pledge of allegiance that affirmed Mu'awiya's legitimacy as caliph, establishing his authority over the Islamic community.",
      "answers": [
        { "text": "Hajj", "is_correct": false },
        { "text": "Bay'ah", "is_correct": true },
        { "text": "Hijra", "is_correct": false },
        { "text": "Majlis", "is_correct": false }
      ]
    }
  ]
}
```

#### Lesson 2: Rise of Damascus (Reel)

```json
{
  "id": "media_2",
  "order_by": 2,
  "content_type": "reel",
  "media_url": ["https://dzyjrzj2lngmg.cloudfront.net/Reel+Videos/Adv1_M1_Reel2.mp4"],
  "thumbnail_url": "https://dzyjrzj2lngmg.cloudfront.net/Thumbnails/Adv1_M1_Thumb.jpg",
  "thumbnail_title": "Rise of Damascus",
  "bottom_content": {
    "reading_text": "<p>Damascus grew quickly under Umayyad rule because of the Barada River. As the river left the mountains, people split its water into canals that turned the dry land around the city into the green Ghouta oasis. The Barada is the same river called Abana in the Bible. With steady water, markets and mosques spread, and the new capital came to life.</p>"
  },
  "questions": [
    {
      "question_text": "Which river nourished Damascus and spurred its rapid growth under Umayyad rule?",
      "question_type": "mcq",
      "explanation": "The Barada River was essential for Damascus's prosperity, providing water for agriculture and enabling the city to flourish as the new imperial capital of the Umayyad Empire.",
      "answers": [
        { "text": "Euphrates", "is_correct": false },
        { "text": "Jordan", "is_correct": false },
        { "text": "Barada", "is_correct": true },
        { "text": "Tigris", "is_correct": false }
      ]
    },
    {
      "question_text": "Which development best illustrates Damascus's emergence as the empire's political center?",
      "question_type": "mcq",
      "explanation": "The growth of markets, new mosques, and the arrival of courtiers showed how Damascus became the bustling political and administrative center of the Umayyad Empire.",
      "answers": [
        { "text": "Rebuilding of the Ka'ba", "is_correct": false },
        { "text": "Bustling markets, new mosques, and arrival of courtiers", "is_correct": true },
        { "text": "Establishment of a navy at Basra", "is_correct": false },
        { "text": "Conquest of al-Andalus", "is_correct": false }
      ]
    },
    {
      "question_text": "What was Ghouta, the area around Damascus fed by the Barada River?",
      "question_type": "mcq",
      "explanation": "As people channeled the Barada River into canals, the dry land around Damascus turned into the Ghouta oasis, a green ring of farms and gardens around the city.",
      "answers": [
        { "text": "A desert fortress far from the city", "is_correct": false },
        { "text": "A mountain pass blocking invaders", "is_correct": false },
        { "text": "A green ring of farms and gardens around Damascus", "is_correct": true },
        { "text": "A chain of coastal ports on the Mediterranean", "is_correct": false }
      ]
    }
  ]
}
```

#### Lesson 3: Palace Interiors (Image Carousel)

```json
{
  "id": "media_3",
  "order_by": 3,
  "content_type": "image_carousel",
  "media_url": [
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv1_M2_Img01.jpg",
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv1_M2_Img02.jpg",
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv1_M2_Img03.jpg",
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv1_M2_Img04.jpg",
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv1_M2_Img05.jpg"
  ],
  "thumbnail_url": "https://dzyjrzj2lngmg.cloudfront.net/Thumbnails/Adv1_M2_Thumb.jpg",
  "thumbnail_title": "Palace Interiors",
  "background_music_url": "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv1_M2_L1_Desert+Whispers.mp3",
  "bottom_content": {
    "reading_text": "<p>The Umayyad palace in Damascus was called the Green Dome, or al-Khadra. Mu'awiya built it beside the Umayyad Mosque as a working seat of power, with a coin mint, stables, and a prison. Sources describe a domed audience hall, marble floors, and gardens with fountains, myrtles, and vines. Later rulers still used the complex, but by the 1000s it had vanished, and travelers wrote that markets stood where the palace once was.</p>",
    "carousel_captions": [
      "The throne room glittered with gold mosaics crafted by Byzantine artists, once rivals but now working for the Umayyads.",
      "Striped arches and lamps light the reception hall, a design that influenced buildings like Cordoba's mosque in Spain.",
      "The courtyard's fountains and trees stayed cool thanks to water channels, turning the palace into an oasis.",
      "In the audience chamber, laws and taxes were debated in Arabic, Greek, and Syriac.",
      "Scribes in the scriptorium copied records, switching between Arabic, Greek, and Syriac."
    ]
  },
  "questions": [
    {
      "question_text": "The throne room walls were covered with what shiny art?",
      "question_type": "mcq",
      "explanation": "The throne room walls were covered with glittering gold mosaic tiles, many crafted by skilled Byzantine artists who once came from a rival empire.",
      "answers": [
        { "text": "Gold mosaic tiles", "is_correct": true },
        { "text": "Plain red bricks", "is_correct": false },
        { "text": "Bare mud walls", "is_correct": false },
        { "text": "Woven cloth curtains", "is_correct": false }
      ]
    },
    {
      "question_text": "What job was done in the palace scriptorium?",
      "question_type": "mcq",
      "explanation": "The palace scriptorium was a writing room where scribes copied records and documents, helping the Umayyad administration run smoothly.",
      "answers": [
        { "text": "Soldiers practiced drills", "is_correct": false },
        { "text": "Musicians performed concerts", "is_correct": false },
        { "text": "Scribes copied records and letters", "is_correct": true },
        { "text": "Farmers sold crops", "is_correct": false }
      ]
    },
    {
      "question_text": "Court talks often used Arabic, Greek, and which other language?",
      "question_type": "mcq",
      "explanation": "Court discussions often used Arabic, Greek, and Syriac, reflecting the multi-lingual nature of the Umayyad administration.",
      "answers": [
        { "text": "Latin", "is_correct": false },
        { "text": "Hebrew", "is_correct": false },
        { "text": "Syriac", "is_correct": true },
        { "text": "Coptic", "is_correct": false }
      ]
    }
  ]
}
```

#### Lesson 4: Court Administration (Reel)

```json
{
  "id": "media_4",
  "order_by": 4,
  "content_type": "reel",
  "media_url": ["https://dzyjrzj2lngmg.cloudfront.net/Reel+Videos/Adv1_M2_Reel1.mp4"],
  "thumbnail_url": "https://dzyjrzj2lngmg.cloudfront.net/Thumbnails/Adv1_M2_Thumb.jpg",
  "thumbnail_title": "Court Administration",
  "bottom_content": {
    "reading_text": "<p>Inside the Umayyad court, every job had a clear task. The chief minister, sometimes called a wazir, helped the caliph run daily affairs, and the qadi judged cases using Islamic law. People spoke Arabic, Greek, and Syriac in meetings. In 696 CE, Abd al-Malik ordered government records to shift into Arabic, which made the system more unified.</p>"
  },
  "questions": [
    {
      "question_text": "Who helped the caliph run the empire each day?",
      "question_type": "mcq",
      "explanation": "The chief minister, or wazir, helped the caliph run the empire's daily affairs, making him one of the most important officials in the Umayyad court.",
      "answers": [
        { "text": "Wazir", "is_correct": true },
        { "text": "Qadi", "is_correct": false },
        { "text": "Scribe", "is_correct": false },
        { "text": "Guard", "is_correct": false }
      ]
    },
    {
      "question_text": "People said the palace felt like both a _______ and a _______.",
      "question_type": "mcq",
      "explanation": "People described the palace as feeling like both a fortress and a safe place, showing how it combined strength, security, and protection.",
      "answers": [
        { "text": "Farm and workshop", "is_correct": false },
        { "text": "Fortress and safe place", "is_correct": true },
        { "text": "Library and theater", "is_correct": false },
        { "text": "Shop and stable", "is_correct": false }
      ]
    },
    {
      "question_text": "In 696 CE, what big change did Abd al-Malik make to government records?",
      "question_type": "mcq",
      "explanation": "In 696 CE, Abd al-Malik ordered that government records be kept in Arabic, which helped unify the Umayyad administration.",
      "answers": [
        { "text": "He destroyed all old records", "is_correct": false },
        { "text": "He moved them to Greek only", "is_correct": false },
        { "text": "He ordered them to be kept in Arabic", "is_correct": true },
        { "text": "He made them secret and locked away", "is_correct": false }
      ]
    }
  ]
}
```

#### Lesson 5: Trade Routes Map (Static Image Reading)

```json
{
  "id": "media_5",
  "order_by": 5,
  "content_type": "static_image_reading",
  "media_url": ["https://dzyjrzj2lngmg.cloudfront.net/Images/Interactive_map.png"],
  "thumbnail_url": "https://dzyjrzj2lngmg.cloudfront.net/Thumbnails/Adv1_M3_Thumb.jpg",
  "thumbnail_title": "Trade Routes Map",
  "bottom_content": {
    "reading_text": "<p>Damascus was more than a capital; it sat where ancient roads met. The King's Highway ran up through the deserts and highlands into the city, bringing caravans from Arabia and the Red Sea. Traders rested in khans – courtyard inns with stables, storage rooms, and a well – where they cared for animals, stored goods, and swapped news before entering the busy markets.</p>",
    "key_terms": [
      { "term": "Caravan", "definition": "Group of traders traveling together for safety" },
      { "term": "Khan", "definition": "Courtyard inn with rooms, stables, and a well for travelers and their animals" }
    ]
  },
  "questions": [
    {
      "question_text": "Trade routes linked Damascus with which three major regions?",
      "question_type": "mcq",
      "explanation": "Caravans and roads connected Damascus with Arabia, Persia, and Byzantium, turning it into a crossroads of goods and ideas.",
      "answers": [
        { "text": "Arabia, Persia, and Byzantium", "is_correct": true },
        { "text": "China, India, and Japan", "is_correct": false },
        { "text": "Scandinavia, Britain, and Ireland", "is_correct": false },
        { "text": "Only local Syrian villages", "is_correct": false }
      ]
    },
    {
      "question_text": "Which key material did Sasanian workers help make famous in Damascus?",
      "question_type": "mcq",
      "explanation": "Sasanian workers helped make Damascus famous for glassmaking, producing bright lamps and tiles that were traded across the empire.",
      "answers": [
        { "text": "Silk", "is_correct": false },
        { "text": "Cotton", "is_correct": false },
        { "text": "Glass", "is_correct": true },
        { "text": "Ivory", "is_correct": false }
      ]
    },
    {
      "question_text": "Spices that reached Damascus usually came from which direction?",
      "question_type": "mcq",
      "explanation": "Spices often traveled north from the south – from Arabia and beyond the Red Sea and Indian Ocean – before reaching Damascus.",
      "answers": [
        { "text": "North", "is_correct": false },
        { "text": "East", "is_correct": false },
        { "text": "West", "is_correct": false },
        { "text": "South", "is_correct": true }
      ]
    }
  ]
}
```

---

## Adventure 2: Building an Empire

### Metadata

| Field | Value |
|-------|-------|
| `readable_id` | `umayyad_adventure_2` |
| `era_id` | `umayyad` |
| `adventure_title` | Building an Empire |
| `adventure_description` | You learned how the Umayyads unified their vast empire through language, currency, and faith. |
| `timeline` | 680 - 705 CE |
| `adv_design` | `standard_6` |
| `order_by` | 2 |
| `icon_url` | `https://dzyjrzj2lngmg.cloudfront.net/Thumbnails/Adv2_Icon.png` |

### Card Content

```json
{
  "era_name": "Umayyad Dynasty",
  "map_image": "https://dzyjrzj2lngmg.cloudfront.net/Images/umayyad_map.png",
  "overview_text": "See how Abd al-Malik unified the empire with Arabic, new coins, and sacred architecture.",
  "estimated_time": "15 min",
  "adventure_story": "Abd al-Malik transformed scattered provinces into a unified Islamic empire. He made Arabic the official language, minted Islamic coins, and built the Dome of the Rock in Jerusalem. These reforms created a shared identity that lasted centuries.",
  "background_image": "https://dzyjrzj2lngmg.cloudfront.net/Thumbnails/Adv2_Background.jpg"
}
```

### Content List (5 Lessons)

#### Lesson 1: Language Reform (Image Carousel)

```json
{
  "id": "media_1",
  "order_by": 1,
  "content_type": "image_carousel",
  "media_url": [
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv2_M1_Img01.jpg",
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv2_M1_Img02.jpg",
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv2_M1_Img03.jpg"
  ],
  "thumbnail_url": "https://dzyjrzj2lngmg.cloudfront.net/Thumbnails/Adv2_M1_Thumb.jpg",
  "thumbnail_title": "Language Reform",
  "background_music_url": "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv2_M1_L1.mp3",
  "bottom_content": {
    "reading_text": "<p>By the 700s, Damascus children practiced Arabic calligraphy to prepare for work as future scribes. In 700 CE, Abd al-Malik ordered all taxes and records written in Arabic instead of Greek or Persian. New scrolls carried the Hijri calendar, counting years from 622 CE, the year of the Prophet's migration (Hijra) from Mecca to Medina.</p>",
    "carousel_captions": [
      "By the 700s, kids in Damascus learned Arabic calligraphy so they could work as future scribes.",
      "In 700 CE, Abd al-Malik ordered all taxes and records written in Arabic instead of Greek or Persian.",
      "New scrolls carried the Hijri calendar (starting 622 CE), the first Islamic dating system."
    ]
  },
  "questions": [
    {
      "question_text": "Which caliph made Arabic the language of government?",
      "question_type": "mcq",
      "explanation": "Abd al-Malik was the Umayyad caliph who made Arabic the official language of government administration, replacing Greek and Persian.",
      "answers": [
        { "text": "Muawiya", "is_correct": false },
        { "text": "Abd al-Malik", "is_correct": true },
        { "text": "Yazid", "is_correct": false },
        { "text": "Marwan", "is_correct": false }
      ]
    },
    {
      "question_text": "Arabic replaced Greek and Persian in official papers.",
      "question_type": "trueFalse",
      "explanation": "Under Abd al-Malik's reforms, Arabic replaced both Greek and Persian in official government documents and administration.",
      "answers": [
        { "text": "True", "is_correct": true },
        { "text": "False", "is_correct": false }
      ]
    },
    {
      "question_text": "Before the change, which of these languages was not common in government scrolls?",
      "question_type": "mcq",
      "explanation": "Latin was not commonly used in government scrolls in Umayyad territories. Greek and Persian were the main administrative languages before Arabic.",
      "answers": [
        { "text": "Greek", "is_correct": false },
        { "text": "Persian", "is_correct": false },
        { "text": "Syriac", "is_correct": false },
        { "text": "Latin", "is_correct": true }
      ]
    }
  ]
}
```

#### Lesson 2: Arabization Policy (Reel)

```json
{
  "id": "media_2",
  "order_by": 2,
  "content_type": "reel",
  "media_url": ["https://dzyjrzj2lngmg.cloudfront.net/Reel+Videos/Adv2_M1_Reel1.mp4"],
  "thumbnail_url": "https://dzyjrzj2lngmg.cloudfront.net/Thumbnails/Adv2_M1_Thumb.jpg",
  "thumbnail_title": "Arabization Policy",
  "bottom_content": {
    "reading_text": "<p>Switching to Arabic was not simple. Some governors resisted, afraid it would upset their control or slow the work of government. Soon, though, new scribes were trained in Arabic, and the diwan, or government office, fully adopted it. This was more than a change in paperwork: Arabic grew into the shared language of law, trade, and empire across the Islamic world.</p>"
  },
  "questions": [
    {
      "question_text": "Did some local governors fight the language switch?",
      "question_type": "trueFalse",
      "explanation": "Some governors feared losing control or slowing government work, so they resisted the language change at first.",
      "answers": [
        { "text": "True", "is_correct": true },
        { "text": "False", "is_correct": false }
      ]
    },
    {
      "question_text": "The word diwan refers to a...",
      "question_type": "mcq",
      "explanation": "Diwan refers to a government office or administrative department in the Islamic empire.",
      "answers": [
        { "text": "Palace", "is_correct": false },
        { "text": "Market", "is_correct": false },
        { "text": "Government office", "is_correct": true },
        { "text": "Mosque", "is_correct": false }
      ]
    },
    {
      "question_text": "Over time, Arabic became the shared language of what across the Islamic world?",
      "question_type": "mcq",
      "explanation": "Arabic became the shared language of law, trade, and empire across the Islamic world.",
      "answers": [
        { "text": "Only poetry and stories", "is_correct": false },
        { "text": "Law, trade, and empire", "is_correct": true },
        { "text": "Just local village news", "is_correct": false },
        { "text": "Only religious sermons", "is_correct": false }
      ]
    }
  ]
}
```

#### Lesson 3: Gold & Silver (Image Carousel)

```json
{
  "id": "media_3",
  "order_by": 3,
  "content_type": "image_carousel",
  "media_url": [
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv2_M2_Img01.jpg",
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv2_M2_Img02.jpg"
  ],
  "thumbnail_url": "https://dzyjrzj2lngmg.cloudfront.net/Thumbnails/Adv2_M2_Thumb.jpg",
  "thumbnail_title": "Gold & Silver",
  "background_music_url": "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv2_M2_L1_Desert+Whispers.mp3",
  "bottom_content": {
    "reading_text": "<p>Before Abd al-Malik's reform, people used coins from older empires. Byzantine coins showed the emperor's face, while Persian coins showed a fire altar, a Zoroastrian symbol. In 696 CE, Abd al-Malik introduced new Islamic dinars with Arabic writing instead of images. These coins helped unify the empire and marked a clear Islamic identity in everyday trade.</p>",
    "carousel_captions": [
      "Initially, people used Byzantine coins showing the emperor's face – even though they were not Muslim.",
      "Other coins came from Persia and showed a fire altar, a symbol of Zoroastrian belief."
    ]
  },
  "questions": [
    {
      "question_text": "In what year did Abd al-Malik launch his coin reform?",
      "question_type": "mcq",
      "explanation": "Abd al-Malik launched his comprehensive coin reform in 696 CE, standardizing currency across the Umayyad Empire.",
      "answers": [
        { "text": "661 CE", "is_correct": false },
        { "text": "680 CE", "is_correct": false },
        { "text": "696 CE", "is_correct": true },
        { "text": "750 CE", "is_correct": false }
      ]
    },
    {
      "question_text": "After the reform, coins still showed the ruler's face.",
      "question_type": "mcq",
      "explanation": "After the reform, coins no longer showed the ruler's face. They carried Arabic inscriptions and Islamic phrases instead.",
      "answers": [
        { "text": "Yes", "is_correct": false },
        { "text": "No", "is_correct": true }
      ]
    },
    {
      "question_text": "The partner metal to the gold dinar was the ____ dirham.",
      "question_type": "mcq",
      "explanation": "The silver dirham was the partner currency to the gold dinar in a standardized bimetallic system.",
      "answers": [
        { "text": "Silver", "is_correct": true },
        { "text": "Copper", "is_correct": false },
        { "text": "Bronze", "is_correct": false },
        { "text": "Iron", "is_correct": false }
      ]
    }
  ]
}
```

#### Lesson 4: Currency Standards (Scrollable Media View)

```json
{
  "id": "media_4",
  "order_by": 4,
  "content_type": "scrollable_media_view",
  "media_url": [
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv2_M2_Img03.jpg",
    "https://dzyjrzj2lngmg.cloudfront.net/carouselvideos/Adv2_M2_Media2_Video1.mp4"
  ],
  "thumbnail_url": "https://dzyjrzj2lngmg.cloudfront.net/Thumbnails/Adv2_M2_Thumb.jpg",
  "thumbnail_title": "Currency Standards",
  "bottom_content": {
    "reading_text": "<p>In the markets of Damascus, merchants weighed gold dinars to be sure they matched the official weight of 4.25 grams. The Arabic writing on each coin let buyers confirm its value without relying only on the seller. From Basra to Tunis, this shared standard made trade smoother and built trust across the empire.</p>",
    "content_blocks": [
      {
        "type": "image",
        "order": 1,
        "url": "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv2_M2_Img03.jpg",
        "text": "In the markets of Damascus, merchants weighed gold dinars to be sure they matched the official weight of 4.25 grams."
      },
      {
        "type": "video",
        "order": 2,
        "url": "https://dzyjrzj2lngmg.cloudfront.net/carouselvideos/Adv2_M2_Media2_Video1.mp4",
        "text": "Caliph Abd al-Malik's reforms made every dinar and dirham the same weight and marked with Arabic, no matter where they were minted."
      }
    ]
  },
  "questions": [
    {
      "question_text": "Why did having the same weight and Arabic words on every dinar help merchants?",
      "question_type": "mcq",
      "explanation": "Same weight and clear Arabic inscriptions built trust, so merchants knew each coin's value wherever they traveled.",
      "answers": [
        { "text": "Let people play games", "is_correct": false },
        { "text": "Made coins shine brighter", "is_correct": false },
        { "text": "Showed rulers changed often", "is_correct": false },
        { "text": "Built trust for fair trade", "is_correct": true }
      ]
    },
    {
      "question_text": "Coins written in Arabic let buyers read them anywhere in the empire.",
      "question_type": "trueFalse",
      "explanation": "Coins written in Arabic let buyers across the empire read and verify them without relying only on the seller.",
      "answers": [
        { "text": "True", "is_correct": true },
        { "text": "False", "is_correct": false }
      ]
    },
    {
      "question_text": "What was the official weight of a gold dinar under Abd al-Malik's reform?",
      "question_type": "mcq",
      "explanation": "Merchants in Damascus weighed gold dinars to check they matched the official standard of 4.25 grams.",
      "answers": [
        { "text": "2 grams", "is_correct": false },
        { "text": "3.5 grams", "is_correct": false },
        { "text": "4.25 grams", "is_correct": true },
        { "text": "5 grams", "is_correct": false }
      ]
    }
  ]
}
```

#### Lesson 5: Sacred Architecture (Image Carousel)

```json
{
  "id": "media_5",
  "order_by": 5,
  "content_type": "image_carousel",
  "media_url": [
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv2_M3_Img01.jpg",
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv2_M3_Img02.jpg",
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv2_M3_Img03.jpg",
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv2_M3_Img04.jpg"
  ],
  "thumbnail_url": "https://dzyjrzj2lngmg.cloudfront.net/Thumbnails/Adv2_M3_Thumb.jpg",
  "thumbnail_title": "Sacred Architecture",
  "background_music_url": "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv2_M2_L1_Desert+Whispers.mp3",
  "bottom_content": {
    "reading_text": "<p>Before Islam, the Temple Mount in Jerusalem lay in ruins, even used as a garbage dump under Byzantine rule. After the Muslim conquest, the site was cleaned and rebuilt. In 691 CE, Abd al-Malik completed the Dome of the Rock there, honoring the Prophet Muhammad's Night Journey and ascension to heaven. At its center sits a great stone that is sacred to Jews, Christians, and Muslims alike.</p>",
    "carousel_captions": [
      "Pre-Muslim conquest, the Temple Mount was in ruins, used as a garbage dump by Byzantine rule to keep Jews away from their holy site.",
      "After the site was cleared of garbage, planners on the Haram al-Sharif prepared designs for the Dome of the Rock.",
      "Jerusalem, 691 CE: the Dome of the Rock rises, a monument built to mark the Prophet's Night Journey.",
      "Inside the Dome, the great rock stands at the center – sacred to Jews, Christians, and Muslims."
    ],
    "key_terms": [
      { "term": "Dome of the Rock", "definition": "Islamic shrine built in 691 CE on Jerusalem's Temple Mount" },
      { "term": "Night Journey", "definition": "Prophet Muhammad's miraculous journey from Mecca to Jerusalem and to heaven" },
      { "term": "Foundation Stone", "definition": "Sacred rock at the center of the Dome, holy to all three Abrahamic faiths" }
    ]
  },
  "questions": [
    {
      "question_text": "Which city did Abd al-Malik choose for his magnificent architectural project?",
      "question_type": "mcq",
      "explanation": "Abd al-Malik chose Jerusalem for his magnificent project, building the Dome of the Rock on the Haram al-Sharif.",
      "answers": [
        { "text": "Damascus", "is_correct": false },
        { "text": "Jerusalem", "is_correct": true },
        { "text": "Mecca", "is_correct": false },
        { "text": "Cairo", "is_correct": false }
      ]
    },
    {
      "question_text": "The Dome of the Rock was completed in 691 CE.",
      "question_type": "trueFalse",
      "explanation": "The Dome of the Rock was completed in 691 CE, making it one of the earliest major Islamic monuments.",
      "answers": [
        { "text": "True", "is_correct": true },
        { "text": "False", "is_correct": false }
      ]
    },
    {
      "question_text": "The sacred stone inside the Dome holds religious significance for which faiths?",
      "question_type": "mcq",
      "explanation": "The great stone inside the Dome is sacred to Jews, Christians, and Muslims, each with their own stories linked to it.",
      "answers": [
        { "text": "Islam only", "is_correct": false },
        { "text": "Judaism only", "is_correct": false },
        { "text": "Christianity only", "is_correct": false },
        { "text": "All three faiths", "is_correct": true }
      ]
    }
  ]
}
```

---

## Adventure 3: Westward Expansion

### Metadata

| Field | Value |
|-------|-------|
| `readable_id` | `umayyad_adventure_3` |
| `era_id` | `umayyad` |
| `adventure_title` | Westward Expansion |
| `adventure_description` | You followed the Umayyad armies from North Africa to the gates of Europe. |
| `timeline` | 670 - 732 CE |
| `adv_design` | `standard_6` |
| `order_by` | 3 |
| `icon_url` | `https://dzyjrzj2lngmg.cloudfront.net/Thumbnails/Adv3_Icon.png` |

### Card Content

```json
{
  "era_name": "Umayyad Dynasty",
  "map_image": "https://dzyjrzj2lngmg.cloudfront.net/Images/umayyad_expansion_map.png",
  "overview_text": "Follow the Umayyad expansion from Kairouan to Gibraltar and the Battle of Tours.",
  "estimated_time": "15 min",
  "adventure_story": "The Umayyads pushed westward across North Africa, founded Kairouan, and crossed into Spain. Tariq ibn Ziyad's landing at Gibraltar in 711 CE began centuries of Islamic rule in Iberia. The advance only stopped at Tours in 732 CE.",
  "background_image": "https://dzyjrzj2lngmg.cloudfront.net/Thumbnails/Adv3_Background.jpg"
}
```

### Content List (5 Lessons)

#### Lesson 1: North Africa (Scrollable Media View)

```json
{
  "id": "media_1",
  "order_by": 1,
  "content_type": "scrollable_media_view",
  "media_url": [
    "https://dzyjrzj2lngmg.cloudfront.net/carouselvideos/Adv3_M1_Media1_Video1.mp4",
    "https://dzyjrzj2lngmg.cloudfront.net/carouselvideos/Adv3_M1_Media1_Video2.mp4"
  ],
  "thumbnail_url": "https://dzyjrzj2lngmg.cloudfront.net/Thumbnails/Adv3_M1_Thumb.jpg",
  "thumbnail_title": "North Africa",
  "bottom_content": {
    "reading_text": "<p>The Umayyads traveled for months through the deserts and hills of North Africa. They faced both resistance and new alliances, pushing forward into unfamiliar terrain with a vision of empire that stretched west.</p>",
    "content_blocks": [
      {
        "type": "video",
        "order": 1,
        "url": "https://dzyjrzj2lngmg.cloudfront.net/carouselvideos/Adv3_M1_Media1_Video1.mp4",
        "text": "The Umayyads traveled for months through the deserts and hills of North Africa. They faced both resistance and new alliances, pushing forward into unfamiliar terrain with a vision of empire that stretched west."
      },
      {
        "type": "video",
        "order": 2,
        "url": "https://dzyjrzj2lngmg.cloudfront.net/carouselvideos/Adv3_M1_Media1_Video2.mp4",
        "text": "In 670 CE, the Umayyads founded Kairouan – the first major Arab city in North Africa. From here, Islam spread not just by conquest, but through trade, scholarship, and diplomacy. A new chapter for the region had begun."
      }
    ]
  },
  "questions": [
    {
      "question_text": "Which city, founded in 670 CE, became the first major Arab city in North Africa?",
      "question_type": "mcq",
      "explanation": "Kairouan was founded in 670 CE as the first major Arab city in North Africa.",
      "answers": [
        { "text": "Carthage", "is_correct": false },
        { "text": "Fez", "is_correct": false },
        { "text": "Tunis", "is_correct": false },
        { "text": "Kairouan", "is_correct": true }
      ]
    },
    {
      "question_text": "Kairouan began as a ____",
      "question_type": "mcq",
      "explanation": "Kairouan began as a military camp and later grew into a major city and center of learning.",
      "answers": [
        { "text": "Military camp", "is_correct": true },
        { "text": "Marketplace", "is_correct": false },
        { "text": "Port city", "is_correct": false },
        { "text": "Palace complex", "is_correct": false }
      ]
    },
    {
      "question_text": "The Umayyad march into North Africa was mainly ____",
      "question_type": "mcq",
      "explanation": "The Umayyad march into North Africa meant months of travel through deserts and hills, meeting both resistance and new allies.",
      "answers": [
        { "text": "A quick sea voyage with little resistance", "is_correct": false },
        { "text": "A peaceful missionary trip with no conflicts", "is_correct": false },
        { "text": "A long trek through deserts facing resistance and forming alliances", "is_correct": true },
        { "text": "A short ride through forests and river valleys", "is_correct": false }
      ]
    }
  ]
}
```

#### Lesson 2: Kairouan Foundation (Reel)

```json
{
  "id": "media_2",
  "order_by": 2,
  "content_type": "reel",
  "media_url": ["https://dzyjrzj2lngmg.cloudfront.net/Reel+Videos/Adv3_M1_Reel1.mp4"],
  "thumbnail_url": "https://dzyjrzj2lngmg.cloudfront.net/Thumbnails/Adv3_M1_Thumb.jpg",
  "thumbnail_title": "Kairouan Foundation",
  "bottom_content": {
    "reading_text": "<p>Kairouan was founded in 670 CE as a military camp but soon grew into a key city of early Islam in North Africa. It became home to the Great Mosque of Kairouan, one of the oldest in the region and a center of scholarship for centuries. The spread of Islam here was gradual, with Berber tribes often resisting or negotiating before joining the new faith.</p>"
  },
  "questions": [
    {
      "question_text": "Did the Berber tribes accept Islam right away?",
      "question_type": "mcq",
      "explanation": "Many Berber tribes resisted or negotiated first; conversion and integration into Islam took time.",
      "answers": [
        { "text": "Yes", "is_correct": false },
        { "text": "No", "is_correct": true }
      ]
    },
    {
      "question_text": "The Umayyad march into North Africa was mainly a ____",
      "question_type": "mcq",
      "explanation": "Reaching and supplying Kairouan meant a difficult desert journey, not a simple sea trip.",
      "answers": [
        { "text": "A sea voyage", "is_correct": false },
        { "text": "A peaceful mission with no resistance", "is_correct": false },
        { "text": "A desert trek", "is_correct": true },
        { "text": "A quick forest ride", "is_correct": false }
      ]
    },
    {
      "question_text": "As Kairouan grew, what important building made it a key center of early Islam in North Africa?",
      "question_type": "mcq",
      "explanation": "Kairouan became home to the Great Mosque of Kairouan, one of the oldest mosques in the region and a major center of learning.",
      "answers": [
        { "text": "A royal palace for Umayyad caliphs only", "is_correct": false },
        { "text": "The Great Mosque of Kairouan, a center of scholarship", "is_correct": true },
        { "text": "A large sea port on the Mediterranean", "is_correct": false },
        { "text": "A fortress used only in wartime", "is_correct": false }
      ]
    }
  ]
}
```

#### Lesson 3: Gibraltar Landing (Image Carousel)

```json
{
  "id": "media_3",
  "order_by": 3,
  "content_type": "image_carousel",
  "media_url": [
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv3_M2_Img01.jpg",
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv3_M2_Img02.jpg",
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv3_M2_Img03.jpg"
  ],
  "thumbnail_url": "https://dzyjrzj2lngmg.cloudfront.net/Thumbnails/Adv3_M2_Thumb.jpg",
  "thumbnail_title": "Gibraltar Landing",
  "background_music_url": "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv3_M2_L1_Desert+Whispers.mp3",
  "bottom_content": {
    "reading_text": "<p>In 711 CE, General Tariq ibn Ziyad crossed from North Africa to the Iberian Peninsula with a small force. He landed at a steep cliff that later took his name, Jabal Tariq, or Gibraltar. According to tradition, he ordered his men to burn their ships, forcing them to push forward with no retreat. That moment marked the beginning of Islam's long history in Spain.</p>",
    "carousel_captions": [
      "Tariq ibn Ziyad lands in Iberia in 711 CE; Gibraltar's name comes from Jabal Tariq, \"Mountain of Tariq.\"",
      "Once they land, the Umayyad troops burn their ships, leaving no way back as they march into Iberia.",
      "The Umayyads march through Iberia, making alliances with Visigoth nobles who opposed their own king."
    ]
  },
  "questions": [
    {
      "question_text": "In what year did Tariq ibn Ziyad land in Iberia?",
      "question_type": "mcq",
      "explanation": "Tariq ibn Ziyad landed in Iberia in 711 CE, beginning the Islamic conquest of the peninsula.",
      "answers": [
        { "text": "700 CE", "is_correct": false },
        { "text": "711 CE", "is_correct": true },
        { "text": "732 CE", "is_correct": false },
        { "text": "755 CE", "is_correct": false }
      ]
    },
    {
      "question_text": "What bold order did Tariq give after landing?",
      "question_type": "mcq",
      "explanation": "Tradition says Tariq ordered his men to burn their ships so they could not retreat.",
      "answers": [
        { "text": "Split the army", "is_correct": false },
        { "text": "Hide their supplies", "is_correct": false },
        { "text": "Burn the ships", "is_correct": true },
        { "text": "Wait for help", "is_correct": false }
      ]
    },
    {
      "question_text": "The name \"Gibraltar\" comes from the Arabic Jabal Tariq.",
      "question_type": "trueFalse",
      "explanation": "\"Gibraltar\" comes from Jabal Tariq, meaning \"Mountain of Tariq.\"",
      "answers": [
        { "text": "True", "is_correct": true },
        { "text": "False", "is_correct": false }
      ]
    }
  ]
}
```

#### Lesson 4: Conquest of Iberia (Scrollable Media View)

```json
{
  "id": "media_4",
  "order_by": 4,
  "content_type": "scrollable_media_view",
  "media_url": [
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv3_M2_Img04.jpg",
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv3_M2_Img05.jpg"
  ],
  "thumbnail_url": "https://dzyjrzj2lngmg.cloudfront.net/Thumbnails/Adv3_M2_Thumb.jpg",
  "thumbnail_title": "Conquest of Iberia",
  "bottom_content": {
    "reading_text": "<p>In 711 CE, Tariq ibn Ziyad defeated King Roderic and the Visigoths at the Battle of Guadalete. The Visigoths were a Germanic people who had ruled Iberia since the fall of Rome, but their kingdom was divided and weak. Many locals – including Jews who faced forced conversions and Catholics who resented some nobles – sometimes viewed the new Muslim rulers as more tolerant.</p>",
    "content_blocks": [
      {
        "type": "image",
        "order": 1,
        "url": "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv3_M2_Img04.jpg",
        "text": "In 711 CE, Tariq ibn Ziyad defeated King Roderic and the Visigoths at the Battle of Guadalete."
      },
      {
        "type": "image",
        "order": 2,
        "url": "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv3_M2_Img05.jpg",
        "text": "Many locals, including some Jews and Catholics, saw the new rulers as more tolerant than the old Visigoth kingdom."
      }
    ]
  },
  "questions": [
    {
      "question_text": "Did Tariq's men plan to sail back to Africa?",
      "question_type": "mcq",
      "explanation": "After burning their ships, Tariq's men had no plan to sail back to Africa.",
      "answers": [
        { "text": "Yes", "is_correct": false },
        { "text": "No", "is_correct": true }
      ]
    },
    {
      "question_text": "What does Jabal Tariq mean in English?",
      "question_type": "mcq",
      "explanation": "Jabal Tariq literally means \"Mountain of Tariq.\"",
      "answers": [
        { "text": "Mountain of Eagles", "is_correct": false },
        { "text": "River of Kings", "is_correct": false },
        { "text": "City of Dawn", "is_correct": false },
        { "text": "Mountain of Tariq", "is_correct": true }
      ]
    },
    {
      "question_text": "Which groups sometimes saw the new Muslim rulers in Iberia as more tolerant than the Visigoth kings?",
      "question_type": "mcq",
      "explanation": "Many locals, including some Jews facing forced conversions and some Catholics unhappy with Visigoth nobles, saw the new rulers as more tolerant.",
      "answers": [
        { "text": "Only the Visigoth nobles", "is_correct": false },
        { "text": "Some Jews and some Catholics", "is_correct": true },
        { "text": "Only visiting merchants", "is_correct": false },
        { "text": "No one in Iberia", "is_correct": false }
      ]
    }
  ]
}
```

#### Lesson 5: Battle of Tours (Reel)

```json
{
  "id": "media_5",
  "order_by": 5,
  "content_type": "reel",
  "media_url": ["https://dzyjrzj2lngmg.cloudfront.net/Reel+Videos/Adv3_M3_Reel1.mp4"],
  "thumbnail_url": "https://dzyjrzj2lngmg.cloudfront.net/Thumbnails/Adv3_M3_Thumb.jpg",
  "thumbnail_title": "Battle of Tours",
  "bottom_content": {
    "reading_text": "<p>In 732 CE, the Umayyad army met the Frankish forces led by Charles Martel near the city of Tours. After days of fighting, the Umayyads withdrew. Martel's victory is remembered as a turning point that stopped further Muslim advance into northern Europe, even though Muslim rule in Spain continued.</p>"
  },
  "questions": [
    {
      "question_text": "In what year did the Umayyad and Frankish armies fight near Tours?",
      "question_type": "mcq",
      "explanation": "The Battle of Tours took place in 732 CE.",
      "answers": [
        { "text": "700 CE", "is_correct": false },
        { "text": "721 CE", "is_correct": false },
        { "text": "732 CE", "is_correct": true },
        { "text": "800 CE", "is_correct": false }
      ]
    },
    {
      "question_text": "Who led the Frankish soldiers in the battle?",
      "question_type": "mcq",
      "explanation": "Charles Martel led the Frankish forces and became famous for this victory.",
      "answers": [
        { "text": "Louis", "is_correct": false },
        { "text": "Charles Martel", "is_correct": true }
      ]
    },
    {
      "question_text": "What was the main result of the battle for Umayyad expansion into northern Europe?",
      "question_type": "mcq",
      "explanation": "The battle halted Umayyad expansion into northern Europe, even though Muslim rule continued in al-Andalus.",
      "answers": [
        { "text": "It stopped further Umayyad advance into northern Europe", "is_correct": true },
        { "text": "It sped up Umayyad conquest of Europe", "is_correct": false },
        { "text": "They captured Paris", "is_correct": false },
        { "text": "Nothing important changed", "is_correct": false }
      ]
    }
  ]
}
```

---

## Adventure 4: Art & Architecture

### Metadata

| Field | Value |
|-------|-------|
| `readable_id` | `umayyad_adventure_4` |
| `era_id` | `umayyad` |
| `adventure_title` | Art & Architecture |
| `adventure_description` | You explored the stunning art, mosques, and palaces that defined Umayyad culture. |
| `timeline` | 685 - 750 CE |
| `adv_design` | `standard_6` |
| `order_by` | 4 |
| `icon_url` | `https://dzyjrzj2lngmg.cloudfront.net/Thumbnails/Adv4_Icon.png` |

### Card Content

```json
{
  "era_name": "Umayyad Dynasty",
  "map_image": "https://dzyjrzj2lngmg.cloudfront.net/Images/umayyad_map.png",
  "overview_text": "Marvel at the stunning mosaics, desert palaces, and Quranic calligraphy of the Umayyads.",
  "estimated_time": "15 min",
  "adventure_story": "The Umayyads blended Islamic faith with Byzantine and Persian artistic traditions. From the glittering mosaics of the Great Mosque of Damascus to the desert retreats of Qasr al-Hayr, they created a distinctive visual culture. Their early Qurans, written in bold Kufic script with gold decoration, became treasures of Islamic art.",
  "background_image": "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M1_Img01.jpg"
}
```

### Content List (5 Lessons)

#### Lesson 1: Mosaics of Damascus (Image Carousel)

```json
{
  "id": "media_1",
  "order_by": 1,
  "content_type": "image_carousel",
  "media_url": [
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M1_Img01.jpg",
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M1_Img02.jpg",
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M1_Img03.jpg"
  ],
  "thumbnail_url": "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M1_Img01.jpg",
  "thumbnail_title": "Mosaics of Damascus",
  "background_music_url": "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv4_M1_L1_Echoes.mp3",
  "bottom_content": {
    "reading_text": "<p>The Great Mosque of Damascus is one of the oldest and most beautiful in the world - and its walls sparkle with Byzantine-made mosaics. These were not pictures of people or battles. Instead, they showed peaceful imaginary landscapes filled with trees, palaces, and flowing water. These dreamlike scenes reminded worshippers of paradise, creating a calm and sacred feeling inside the mosque.</p>",
    "carousel_captions": [
      "The Great Mosque of Damascus is one of the oldest and most beautiful in the world - and its walls sparkle with Byzantine-made mosaics.",
      "These were not pictures of people or battles. Instead, they showed peaceful imaginary landscapes filled with trees, palaces, and flowing water.",
      "These dreamlike scenes reminded worshippers of paradise, creating a calm and sacred feeling inside the mosque."
    ]
  },
  "questions": [
    {
      "question_text": "Artists from which former empire made the mosque's sparkling mosaics?",
      "question_type": "mcq",
      "explanation": "The Umayyads invited expert Byzantine mosaic artists to decorate the Great Mosque of Damascus.",
      "answers": [
        { "text": "Persia", "is_correct": false },
        { "text": "India", "is_correct": false },
        { "text": "Egypt", "is_correct": false },
        { "text": "Byzantium", "is_correct": true }
      ]
    },
    {
      "question_text": "What do the mosaics mainly show?",
      "question_type": "mcq",
      "explanation": "The mosaics showed peaceful imaginary landscapes with trees, palaces, and flowing water.",
      "answers": [
        { "text": "Gardens and palaces", "is_correct": true },
        { "text": "Big battles", "is_correct": false },
        { "text": "Rulers' faces", "is_correct": false },
        { "text": "Maps of Damascus", "is_correct": false }
      ]
    },
    {
      "question_text": "The mosaics were meant to give worshippers a calm, paradise-like feeling.",
      "question_type": "trueFalse",
      "explanation": "The dreamlike scenes reminded worshippers of paradise and created a calm, sacred atmosphere.",
      "answers": [
        { "text": "True", "is_correct": true },
        { "text": "False", "is_correct": false }
      ]
    }
  ]
}
```

#### Lesson 2: Byzantine Artists (Reel)

```json
{
  "id": "media_2",
  "order_by": 2,
  "content_type": "reel",
  "media_url": ["https://dzyjrzj2lngmg.cloudfront.net/Reel%20Videos/Adv4_M1_Reel1.mp4"],
  "thumbnail_url": "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M1_Img01.jpg",
  "thumbnail_title": "Byzantine Artists",
  "bottom_content": {
    "reading_text": "<p>To build something this beautiful, the Umayyads invited expert Byzantine mosaic artists - even though they came from a former rival empire. This shows how the Umayyads valued skill, no matter where it came from. They did not just decorate for beauty - they used art to create peace, wonder, and connection. Their mosaics did not tell one story - they told many, in color and light.</p>"
  },
  "questions": [
    {
      "question_text": "Did the mosaics include pictures of people?",
      "question_type": "trueFalse",
      "explanation": "The mosaics avoided human figures and battles, focusing on landscapes instead.",
      "answers": [
        { "text": "Yes", "is_correct": false },
        { "text": "No", "is_correct": true }
      ]
    },
    {
      "question_text": "Why did the Umayyads invite Byzantine artists to work in Damascus?",
      "question_type": "mcq",
      "explanation": "The Umayyads valued artistic skill, no matter where it came from.",
      "answers": [
        { "text": "Workers were busy", "is_correct": false },
        { "text": "It was part of a treaty", "is_correct": false },
        { "text": "They valued their skill, even from rivals", "is_correct": true },
        { "text": "They wanted to convert the Byzantines", "is_correct": false }
      ]
    },
    {
      "question_text": "According to the description, what did the Umayyads hope to create with their mosaics?",
      "question_type": "mcq",
      "explanation": "They used art not just for decoration, but to create peace, wonder, and connection.",
      "answers": [
        { "text": "Only to show political power", "is_correct": false },
        { "text": "To create peace, wonder, and connection", "is_correct": true },
        { "text": "To display battle victories", "is_correct": false },
        { "text": "To copy Roman emperors", "is_correct": false }
      ]
    }
  ]
}
```

#### Lesson 3: Palace Life (Image Carousel)

```json
{
  "id": "media_3",
  "order_by": 3,
  "content_type": "image_carousel",
  "media_url": [
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M2_Img04.png",
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M2_Img05.png",
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M2_Img06.png"
  ],
  "thumbnail_url": "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M2_Img01.jpg",
  "thumbnail_title": "Palace Life",
  "background_music_url": "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv4_M2_L1.mp3",
  "bottom_content": {
    "reading_text": "<p>Even out in the desert, life at a palace could feel like paradise. Fresh water ran through clever channels beneath the stone, feeding fountains and gardens. Visitors rested in shaded walkways, while caliphs went on hunting trips nearby. These palaces showed the Umayyads' ability to bring beauty, comfort, and control - even to the harshest places.</p>",
    "carousel_captions": [
      "Courtyard life at Qasr al-Hayr: carved stone, swaying palms, and the rhythm of desert luxury at an Umayyad retreat.",
      "Water flows through hidden channels into a tiled fountain - cooling the desert air.",
      "Riders and a falconer gather at the edge of Qasr al-Hayr's courtyard. Ornate arches frame the desert beyond."
    ]
  },
  "questions": [
    {
      "question_text": "Qasr al-Hayr was built in which region?",
      "question_type": "mcq",
      "explanation": "Qasr al-Hayr was built out in the Syrian desert as a remote Umayyad retreat.",
      "answers": [
        { "text": "Nile Delta", "is_correct": false },
        { "text": "Syrian desert", "is_correct": true },
        { "text": "Coast of Arabia", "is_correct": false },
        { "text": "Mountains of Anatolia", "is_correct": false }
      ]
    },
    {
      "question_text": "Did the palace serve as a hunting lodge for Umayyad rulers?",
      "question_type": "mcq",
      "explanation": "The palaces served as hunting lodges where rulers could ride and hunt nearby.",
      "answers": [
        { "text": "Yes", "is_correct": true },
        { "text": "No", "is_correct": false }
      ]
    },
    {
      "question_text": "Which kind of decoration covered many palace walls?",
      "question_type": "mcq",
      "explanation": "Many palace walls were covered with carved stucco designs.",
      "answers": [
        { "text": "Marble tiles", "is_correct": false },
        { "text": "Colored glass", "is_correct": false },
        { "text": "Stucco patterns", "is_correct": true },
        { "text": "Iron plates", "is_correct": false }
      ]
    }
  ]
}
```

#### Lesson 4: Desert Palaces (Image Carousel)

```json
{
  "id": "media_4",
  "order_by": 4,
  "content_type": "image_carousel",
  "media_url": [
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M2_Img01.jpg",
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M2_Img02.jpg",
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M2_Img03.jpg"
  ],
  "thumbnail_url": "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M2_Img01.jpg",
  "thumbnail_title": "Desert Palaces",
  "background_music_url": "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv4_M2_L2.mp3",
  "bottom_content": {
    "reading_text": "<p>In the middle of the Syrian desert, the Umayyads built desert palaces like Qasr al-Hayr - calm retreats far from the crowded cities. These were not just places to relax. They were hunting lodges, rest stops for caravans, and centers of rural life. The walls were decorated with stucco designs, and cool water flowed through pools and channels to beat the desert heat.</p>",
    "carousel_captions": [
      "Qasr al-Hayr as it looks today.",
      "Qasr al-Hayr as it looks today.",
      "Overhead shot of Qasr al-Hayr as it looks today."
    ]
  },
  "questions": [
    {
      "question_text": "Why was Qasr al-Hayr useful to passing caravans?",
      "question_type": "mcq",
      "explanation": "Caravans could stop at Qasr al-Hayr to rest, find shade, and refill water.",
      "answers": [
        { "text": "Guarded the coastline", "is_correct": false },
        { "text": "Ran famous schools", "is_correct": false },
        { "text": "Controlled sea ports", "is_correct": false },
        { "text": "Offered rest, shade, and water", "is_correct": true }
      ]
    },
    {
      "question_text": "Fresh water ran through hidden channels to cool the palace.",
      "question_type": "trueFalse",
      "explanation": "Hidden channels carried fresh water to pools and fountains, cooling the palace.",
      "answers": [
        { "text": "True", "is_correct": true },
        { "text": "False", "is_correct": false }
      ]
    },
    {
      "question_text": "Desert palaces like Qasr al-Hayr showed the Umayyads could bring comfort and luxury to which kind of environment?",
      "question_type": "mcq",
      "explanation": "These palaces showed the Umayyads could bring beauty and comfort even to harsh desert places.",
      "answers": [
        { "text": "Busy city centers", "is_correct": false },
        { "text": "Harsh desert landscapes", "is_correct": true },
        { "text": "Snowy mountain passes", "is_correct": false },
        { "text": "Crowded sea ports", "is_correct": false }
      ]
    }
  ]
}
```

#### Lesson 5: Quranic Script (Scrollable Media View)

```json
{
  "id": "media_5",
  "order_by": 5,
  "content_type": "scrollable_media_view",
  "media_url": [
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M3_Img01.png",
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M3_Img02.jpg",
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M3_Img03.jpg",
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M3_Img04.png"
  ],
  "thumbnail_url": "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M3_Img01.png",
  "thumbnail_title": "Quranic Script",
  "background_music_url": "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv4_M3_L2.mp3",
  "bottom_content": {
    "reading_text": "<p>The earliest Qurans were written in Kufic script - bold, angular letters without vowels. Every stroke had to be perfect, guiding readers through rhythm and shape alone.</p>",
    "content_blocks": [
      {
        "type": "section",
        "title": "The Birth of Quranic Script",
        "order": 1,
        "image_url": "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M3_Img01.png",
        "text": "The earliest Qurans were written in Kufic script - bold, angular letters without vowels. Every stroke had to be perfect, guiding readers through rhythm and shape alone."
      },
      {
        "type": "section",
        "title": "Gold Lines of Revelation",
        "order": 2,
        "image_url": "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M3_Img02.jpg",
        "text": "To mark a new chapter or surah, scribes added gold-leaf bands. These shimmering lines made the divine words shine - literally - on the page."
      },
      {
        "type": "section",
        "title": "The Addition of Dots and Vowels",
        "order": 3,
        "image_url": "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M3_Img03.jpg",
        "text": "At first, Quranic script had no dots or vowels. Later scribes added red diacritical marks to help readers pronounce every verse precisely."
      },
      {
        "type": "section",
        "title": "Gardens on the Page",
        "order": 4,
        "image_url": "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M3_Img04.png",
        "text": "Floral borders wrapped each page in beauty. No pictures - only patterns, echoing gardens of paradise and the sacred rhythm of the words within."
      }
    ]
  },
  "questions": [
    {
      "question_text": "The earliest Umayyad Qurans were written in which script style?",
      "question_type": "mcq",
      "explanation": "The earliest Umayyad Qurʼans were written in bold, angular Kufic script.",
      "answers": [
        { "text": "Naskh", "is_correct": false },
        { "text": "Diwani", "is_correct": false },
        { "text": "Kufic", "is_correct": true },
        { "text": "Thuluth", "is_correct": false }
      ]
    },
    {
      "question_text": "What precious metal did scribes mix into paint to mark new chapters (surahs)?",
      "question_type": "mcq",
      "explanation": "Scribes used gold to highlight new chapters and decorative elements, making the words shine.",
      "answers": [
        { "text": "Silver", "is_correct": false },
        { "text": "Gold", "is_correct": true },
        { "text": "Copper", "is_correct": false },
        { "text": "Iron", "is_correct": false }
      ]
    },
    {
      "question_text": "What color were the dots (diacritical marks) later added to help readers pronounce the words?",
      "question_type": "mcq",
      "explanation": "Red dots were added later as diacritical marks to guide pronunciation.",
      "answers": [
        { "text": "Blue", "is_correct": false },
        { "text": "Red", "is_correct": true },
        { "text": "Green", "is_correct": false },
        { "text": "Purple", "is_correct": false }
      ]
    }
  ]
}
```

---

## Adventure 5: The Fall of Damascus

### Metadata

| Field | Value |
|-------|-------|
| `readable_id` | `umayyad_adventure_5` |
| `era_id` | `umayyad` |
| `adventure_title` | The Fall of Damascus |
| `adventure_description` | You witnessed the end of Umayyad rule and the rise of the Abbasids. |
| `timeline` | 720 - 750 CE |
| `adv_design` | `standard_6` |
| `order_by` | 5 |
| `icon_url` | `https://dzyjrzj2lngmg.cloudfront.net/Thumbnails/Adv5_Icon.png` |

### Card Content

```json
{
  "era_name": "Umayyad Dynasty",
  "map_image": "https://dzyjrzj2lngmg.cloudfront.net/Images/umayyad_map.png",
  "overview_text": "See how internal tensions and a powerful revolution brought the Umayyad Dynasty to an end.",
  "estimated_time": "15 min",
  "adventure_story": "By 750 CE, the Umayyad Dynasty faced growing discontent. In the east, the Abbasids built a revolutionary movement with black banners and powerful slogans. Their victory marked the end of Umayyad rule in the east and the founding of Baghdad as the new center of Islamic civilization.",
  "background_image": "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv5_M1_Img01.png"
}
```

### Content List (5 Lessons)

#### Lesson 1: Yazid II's Reign (Image Carousel)

```json
{
  "id": "media_1",
  "order_by": 1,
  "content_type": "image_carousel",
  "media_url": [
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv5_M1_Img01.png",
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv5_M1_Img02.png",
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv5_M1_Img03.png"
  ],
  "thumbnail_url": "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv5_M1_Img01.png",
  "thumbnail_title": "Yazid II's Reign",
  "background_music_url": "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv5_M1_L1.mp3",
  "bottom_content": {
    "reading_text": "<p>Yazid II became caliph in 720 CE, during a moment when the Umayyad Empire still seemed strong. His four-year reign saw beautiful buildings and artistic projects that blended Islamic, Byzantine, and Persian styles. But his strict religious policies – like banning music and poetry at court – angered many scholars and artists. In the east, especially Khorasan, unrest and rebellion grew, opening cracks in Umayyad unity that would be hard to repair.</p>",
    "carousel_captions": [
      "Under Yazid II, the Umayyad court still shone with art and architecture – even as tensions began to rise beneath the surface.",
      "Artists and builders worked in a style that blended Islamic, Byzantine, and Persian ideas into a new Umayyad look.",
      "While the capital enjoyed splendor, faraway provinces like Khorasan rumbled with revolt and dissatisfaction."
    ],
    "key_terms": [
      { "term": "Cultural Synthesis", "definition": "The blending of Islamic, Byzantine, and Persian artistic traditions" },
      { "term": "Artistic Patronage", "definition": "Royal support and funding for artists, architects, and scholars" },
      { "term": "Khorasan", "definition": "Eastern region of the empire where major rebellions broke out" }
    ]
  },
  "questions": [
    {
      "question_text": "Yazid II ruled the empire from 720 to which year?",
      "question_type": "mcq",
      "explanation": "Yazid II ruled from 720 to 724 CE, a short four-year reign that still left a big mark on the dynasty.",
      "answers": [
        { "text": "722 CE", "is_correct": false },
        { "text": "726 CE", "is_correct": false },
        { "text": "724 CE", "is_correct": true },
        { "text": "730 CE", "is_correct": false }
      ]
    },
    {
      "question_text": "Yazid II encouraged more music and poetry at court.",
      "question_type": "trueFalse",
      "explanation": "False. Yazid II banned music and poetry at court, which upset many artists and scholars.",
      "answers": [
        { "text": "True", "is_correct": false },
        { "text": "False", "is_correct": true }
      ]
    },
    {
      "question_text": "Rebellion against Yazid II was strongest in which eastern region?",
      "question_type": "mcq",
      "explanation": "Rebellion was strongest in Khorasan, in the eastern part of the empire – a region that later became a heartland of Abbasid support.",
      "answers": [
        { "text": "Egypt", "is_correct": false },
        { "text": "al-Andalus", "is_correct": false },
        { "text": "Yemen", "is_correct": false },
        { "text": "Khorasan", "is_correct": true }
      ]
    }
  ]
}
```

#### Lesson 2: Revolutionary Strategy (Reel)

```json
{
  "id": "media_2",
  "order_by": 2,
  "content_type": "reel",
  "media_url": ["https://dzyjrzj2lngmg.cloudfront.net/Reel+Videos/Adv5_M2_Reel1.mp4"],
  "thumbnail_url": "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv5_M2_Img01.png",
  "thumbnail_title": "Revolutionary Strategy",
  "bottom_content": {
    "reading_text": "<p>Long before the Abbasids took the throne, they built a movement in whispers and promises. Pamphlets, secret meetings, and emotional appeals were their tools. They offered a new vision: an empire with fair leadership, loyal to the Prophet's family. Their black banners, their claim to Hashimite descent, and slogans like \"Revenge for Husayn\" lit a fire that would soon change the Islamic world forever.</p>",
    "key_terms": [
      { "term": "Propaganda", "definition": "Strategic messages used to win support and shape opinion" },
      { "term": "Ahl al-Bayt", "definition": "The Prophet's family, central to Abbasid claims of legitimacy" }
    ]
  },
  "questions": [
    {
      "question_text": "What color banner became the main symbol of the Abbasid revolt?",
      "question_type": "mcq",
      "explanation": "Black banners became the main symbol of the Abbasid revolt, standing out against the Umayyads' white banners.",
      "answers": [
        { "text": "Green", "is_correct": false },
        { "text": "White", "is_correct": false },
        { "text": "Red", "is_correct": false },
        { "text": "Black", "is_correct": true }
      ]
    },
    {
      "question_text": "The Abbasids said they were descendants of which clan?",
      "question_type": "mcq",
      "explanation": "The Abbasids claimed descent from the Hashimite clan, the same clan as Prophet Muhammad, which strengthened their religious legitimacy.",
      "answers": [
        { "text": "Umayyad", "is_correct": false },
        { "text": "Ghassanid", "is_correct": false },
        { "text": "Hashimite", "is_correct": true },
        { "text": "Lakhmid", "is_correct": false }
      ]
    },
    {
      "question_text": "\"Revenge for Husayn\" was one of the Abbasid slogans.",
      "question_type": "trueFalse",
      "explanation": "\"Revenge for Husayn\" became one of their most powerful slogans, speaking to grief and anger over Husayn's death.",
      "answers": [
        { "text": "True", "is_correct": true },
        { "text": "False", "is_correct": false }
      ]
    }
  ]
}
```

#### Lesson 3: Revolutionary Symbols (Image Carousel)

```json
{
  "id": "media_3",
  "order_by": 3,
  "content_type": "image_carousel",
  "media_url": [
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv5_M2_Img01.png",
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv5_M2_Img02.png",
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv5_M2_Img03.png",
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv5_M2_Img04.png"
  ],
  "thumbnail_url": "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv5_M2_Img01.png",
  "thumbnail_title": "Revolutionary Symbols",
  "background_music_url": "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv5_M2_L2.mp3",
  "bottom_content": {
    "reading_text": "<p>The Abbasids did not take power by force alone. They used powerful words and symbols. Their black banners stood in contrast to the Umayyads' white ones, and their slogans promised revenge for Husayn and justice for the Prophet's family (Ahl al-Bayt). Pamphlets, secret meetings, and quiet speeches spread this message across towns and villages until people were ready to listen – and ready to act.</p>",
    "carousel_captions": [
      "An Abbasid rider enters a desert town square, black banner raised. Onlookers watch as a revolution begins.",
      "By candlelight, Abbasid supporters plan in secret – scrolls, slogans, and quiet resolve in a hidden room.",
      "In a village square, an Abbasid speaker rallies the crowd beneath a black banner. The message is clear – and the momentum is building.",
      "At twilight, Abbasid slogans circulate quietly through village alleys. Whispers grow as curiosity meets caution."
    ],
    "key_terms": [
      { "term": "Black Banner", "definition": "Symbol of Abbasid revolution, opposite to the Umayyads' white banners" },
      { "term": "Revolutionary Slogans", "definition": "Short, powerful phrases that promised justice and change" }
    ]
  },
  "questions": [
    {
      "question_text": "The Abbasids relied only on big battles, not on words and ideas, to win support.",
      "question_type": "trueFalse",
      "explanation": "The Abbasids relied heavily on words, stories, and symbols – not just big battles – to win hearts and minds.",
      "answers": [
        { "text": "True", "is_correct": false },
        { "text": "False", "is_correct": true }
      ]
    },
    {
      "question_text": "How did Abbasid supporters quietly spread their message before open fighting began?",
      "question_type": "mcq",
      "explanation": "Abbasid supporters quietly passed pamphlets and letters, spreading their message long before open rebellion.",
      "answers": [
        { "text": "Handing out pamphlets and letters", "is_correct": true },
        { "text": "Building tall towers", "is_correct": false },
        { "text": "Changing banner colors only", "is_correct": false },
        { "text": "Starting trade wars", "is_correct": false }
      ]
    },
    {
      "question_text": "Abbasid slogans often promised justice for which family?",
      "question_type": "mcq",
      "explanation": "Abbasid slogans promised justice for the Prophet's family, which spoke to people who felt the Umayyads had treated them unfairly.",
      "answers": [
        { "text": "The Prophet's family (Ahl al-Bayt)", "is_correct": true },
        { "text": "The Umayyad family", "is_correct": false },
        { "text": "Local governors only", "is_correct": false },
        { "text": "Foreign allies", "is_correct": false }
      ]
    }
  ]
}
```

#### Lesson 4: Abbasid Revolution (Reel)

```json
{
  "id": "media_4",
  "order_by": 4,
  "content_type": "reel",
  "media_url": ["https://dzyjrzj2lngmg.cloudfront.net/Reel%20Videos/Adv5_M3_Reel1.mp4"],
  "thumbnail_url": "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv5_M3_Img01.png",
  "thumbnail_title": "Abbasid Revolution",
  "bottom_content": {
    "reading_text": "<p>In 750 CE, after years of unrest, the Abbasids overthrew the Umayyads and took control of the Islamic world. They promised fairness, knowledge, and leadership connected to the Prophet's family. To mark this new beginning, they founded a brand-new capital: Baghdad – a city built from scratch beside the Tigris River to reflect their power, order, and love of learning. It became the shining heart of a new age.</p>",
    "key_terms": [
      { "term": "New Order", "definition": "Abbasid promise of fairness, knowledge, and proper Islamic leadership" },
      { "term": "Round City", "definition": "Baghdad's circular design symbolizing unity and perfection" }
    ]
  },
  "questions": [
    {
      "question_text": "In what year did the Abbasids defeat the Umayyads and seize power?",
      "question_type": "mcq",
      "explanation": "In 750 CE, the Abbasids defeated the Umayyads and seized power in the eastern Islamic world.",
      "answers": [
        { "text": "661 CE", "is_correct": false },
        { "text": "711 CE", "is_correct": false },
        { "text": "750 CE", "is_correct": true },
        { "text": "800 CE", "is_correct": false }
      ]
    },
    {
      "question_text": "Baghdad, the new Abbasid capital, was built beside which river?",
      "question_type": "mcq",
      "explanation": "Baghdad was built beside the Tigris River, a key route for trade, travel, and supplies.",
      "answers": [
        { "text": "Nile", "is_correct": false },
        { "text": "Tigris", "is_correct": true },
        { "text": "Euphrates", "is_correct": false },
        { "text": "Jordan", "is_correct": false }
      ]
    },
    {
      "question_text": "Baghdad was planned as a perfect circle.",
      "question_type": "trueFalse",
      "explanation": "Baghdad was planned as a perfect circle – the famous \"Round City\" – to show order, unity, and balance.",
      "answers": [
        { "text": "True", "is_correct": true },
        { "text": "False", "is_correct": false }
      ]
    }
  ]
}
```

#### Lesson 5: The Round City (Image Carousel)

```json
{
  "id": "media_5",
  "order_by": 5,
  "content_type": "image_carousel",
  "media_url": [
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv5_M3_Img01.png",
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv5_M3_Img02.png",
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv5_M3_Img03.png",
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv5_M3_Img04.png",
    "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv5_M3_Img05.png"
  ],
  "thumbnail_url": "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv5_M3_Img01.png",
  "thumbnail_title": "The Round City",
  "background_music_url": "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv5_M3_L2.mp3",
  "bottom_content": {
    "reading_text": "<p>The Abbasids wanted a capital that showed unity and vision. They chose a site near the Tigris River and designed Baghdad as a perfect circle: a city of balance and brilliance. While the Umayyads fell in the East, some family members escaped west and later ruled from Cordoba. But in the heart of the Islamic world, the Abbasids had built a new order – one that would shape the next 500 years.</p>",
    "carousel_captions": [
      "Caliph al-Mansur and his planners survey the future site of Baghdad – scrolls in hand, the Tigris below, and a circle taking shape in the sand.",
      "Early Abbasid Baghdad rises by the Tigris, a circular city with domes, markets, and neighborhoods unfolding from the center.",
      "At the heart of Baghdad's Round City, the caliph's palace and Grand Mosque anchor a center of power and faith.",
      "At Bab al-Kufa, traders and travelers enter Baghdad through carved gates where daily life meets imperial design.",
      "In Baghdad's outer districts, markets, baths, and schools line the curved streets – home to a diverse and busy city life."
    ],
    "key_terms": [
      { "term": "Round City", "definition": "Baghdad's unique circular plan symbolizing unity and perfection" },
      { "term": "Tigris River", "definition": "The river beside which Baghdad was founded, key for trade and travel" }
    ]
  },
  "questions": [
    {
      "question_text": "Did every member of the Umayyad family lose power after 750 CE?",
      "question_type": "trueFalse",
      "explanation": "Not all Umayyads lost power. Some escaped west and later ruled from Cordoba in al-Andalus.",
      "answers": [
        { "text": "True", "is_correct": false },
        { "text": "False", "is_correct": true }
      ]
    },
    {
      "question_text": "Which caliph led the planning of Baghdad's 'Round City'?",
      "question_type": "mcq",
      "explanation": "Caliph al-Mansur led the planning and building of Baghdad's Round City.",
      "answers": [
        { "text": "al-Mansur", "is_correct": true },
        { "text": "Harun al-Rashid", "is_correct": false },
        { "text": "al-Mahdi", "is_correct": false },
        { "text": "al-Mu'tasim", "is_correct": false }
      ]
    },
    {
      "question_text": "Baghdad's circular design was chosen to symbolize what?",
      "question_type": "mcq",
      "explanation": "The perfect circle design was meant to reflect unity, balance, and a well-ordered world under Abbasid rule.",
      "answers": [
        { "text": "Chaos and disorder", "is_correct": false },
        { "text": "Unity, balance, and cosmic order", "is_correct": true },
        { "text": "Fear and secrecy", "is_correct": false },
        { "text": "Only military strength", "is_correct": false }
      ]
    }
  ]
}
```

---

## SQL Insert Template

To insert these adventures into the `content` table, use this pattern:

```sql
INSERT INTO content (
  readable_id,
  era_id,
  adventure_title,
  adventure_description,
  timeline,
  adv_design,
  order_by,
  icon_url,
  content_list,
  card_content
) VALUES (
  'umayyad_adventure_1',
  'umayyad',
  'The Rise of Damascus',
  'You witnessed how Damascus became the heart of a new empire.',
  '661 - 680 CE',
  'standard_6',
  1,
  'https://dzyjrzj2lngmg.cloudfront.net/Thumbnails/Adv1_Icon.png',
  '[...]'::jsonb,  -- Full content_list JSON here
  '{...}'::jsonb   -- Full card_content JSON here
);
```

---

## Content Types Reference

| Type | Description | Media Format |
|------|-------------|--------------|
| `reel` | Single video with reading card | `media_url: [single_video_url]` |
| `image_carousel` | Swipeable image gallery | `media_url: [image1, image2, ...]` |
| `video_carousel` | Swipeable video gallery | `media_url: [video1, video2, ...]` |
| `scrollable_media_view` | Mixed content with sections | `content_blocks: [{type, url, text}]` |
| `static_image_reading` | Hero image with text | `media_url: [single_image_url]` |

---

## CDN Base URLs

- **CloudFront**: `https://dzyjrzj2lngmg.cloudfront.net/`
  - Videos: `/Reel+Videos/`, `/carouselvideos/`
  - Images: `/Images/`
  - Thumbnails: `/Thumbnails/`
  - Audio: `/Audios/`
