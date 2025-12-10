# Era Selection Page - Testing Guide

## Current Supabase Data (eras table)

| order_by | era_id | title | status | card_layout | bg_url |
|----------|--------|-------|--------|-------------|--------|
| 1 | `rise_of_islam` | Rise of Islam (570–632 CE) | `active` | `full_width` | ✅ CloudFront |
| 2 | `umayyad` | Umayyad Dynasty (661–750 CE) | `active` | `full_width` | ✅ CloudFront |
| 3 | `abbasid` | Abbasid Golden Age (750–1258 CE) | `coming_soon` | `grid` | ✅ CloudFront |
| 4 | `rashidun` | Rashidun Caliphate (632-661 CE) | `coming_soon` | `grid` | ❌ null |
| 5 | `andalus` | Al-Andalus (711-1492 CE) | `coming_soon` | `grid` | ❌ null |
| 6 | `women_of_islam` | Women of Islam | `coming_soon` | `grid` | ❌ null |
| 7 | `prophets` | Prophets Series | `coming_soon` | `grid` | ❌ null |
| 8 | `mongol` | Mongol Invasions (1219–1312 CE) | `coming_soon` | `grid` | ❌ null |
| 9 | `new` | das (TEST DATA) | `active` | `full_width` | ❌ invalid |

---

## Raw JSON Schema

```json
[
  {
    "idx": 0,
    "era_id": "abbasid",
    "title": "Abbasid Golden Age (750–1258 CE)",
    "timeline": "750–1258 CE",
    "description": "An age of science, literature, and innovation centered in Baghdad",
    "icon_url": null,
    "bg_url": "https://d8kbkcbgr0qv4.cloudfront.net/era-selection/era3-bg.jpg",
    "card_layout": "grid",
    "design": "bento_grid",
    "order_by": 3,
    "created_at": "2025-12-05 17:02:43.221724+00",
    "updated_at": "2025-12-05 21:13:56.357182+00",
    "status": "coming_soon",
    "subtitle": null
  },
  {
    "idx": 1,
    "era_id": "andalus",
    "title": "Al-Andalus (711-1492 CE)",
    "timeline": "711-1492 CE",
    "description": "Islamic civilization in medieval Iberian Peninsula",
    "icon_url": null,
    "bg_url": null,
    "card_layout": "grid",
    "design": "bento_grid",
    "order_by": 5,
    "created_at": "2025-12-05 17:02:43.221724+00",
    "updated_at": "2025-12-05 17:02:43.221724+00",
    "status": "coming_soon",
    "subtitle": null
  },
  {
    "idx": 2,
    "era_id": "mongol",
    "title": "Mongol Invasions (1219–1312 CE)",
    "timeline": "1219–1312 CE",
    "description": "The Mongol conquests and their impact on Islamic lands",
    "icon_url": null,
    "bg_url": null,
    "card_layout": "grid",
    "design": "bento_grid",
    "order_by": 8,
    "created_at": "2025-12-05 17:02:43.221724+00",
    "updated_at": "2025-12-05 17:02:43.221724+00",
    "status": "coming_soon",
    "subtitle": null
  },
  {
    "idx": 3,
    "era_id": "new",
    "title": "das",
    "timeline": "das",
    "description": "sda",
    "icon_url": "das",
    "bg_url": "dsa",
    "card_layout": "full_width",
    "design": "sdsa",
    "order_by": 9,
    "created_at": "2025-12-09 15:59:32.133683+00",
    "updated_at": "2025-12-09 16:04:55.668351+00",
    "status": "active",
    "subtitle": null
  },
  {
    "idx": 4,
    "era_id": "prophets",
    "title": "Prophets Series",
    "timeline": "Various",
    "description": "Stories and teachings of the Islamic prophets",
    "icon_url": null,
    "bg_url": null,
    "card_layout": "grid",
    "design": "bento_grid",
    "order_by": 7,
    "created_at": "2025-12-05 17:02:43.221724+00",
    "updated_at": "2025-12-05 17:02:43.221724+00",
    "status": "coming_soon",
    "subtitle": null
  },
  {
    "idx": 5,
    "era_id": "rashidun",
    "title": "Rashidun Caliphate (632-661 CE)",
    "timeline": "632-661 CE",
    "description": "The first four caliphs who succeeded Prophet Muhammad",
    "icon_url": null,
    "bg_url": null,
    "card_layout": "grid",
    "design": "bento_grid",
    "order_by": 4,
    "created_at": "2025-12-05 17:02:43.221724+00",
    "updated_at": "2025-12-05 17:02:43.221724+00",
    "status": "coming_soon",
    "subtitle": null
  },
  {
    "idx": 6,
    "era_id": "rise_of_islam",
    "title": "Rise of Islam (570–632 CE)",
    "timeline": "570–632 CE",
    "description": "The life of Prophet Muhammad and the birth of Islam",
    "icon_url": null,
    "bg_url": "https://d8kbkcbgr0qv4.cloudfront.net/era-selection/era2-bg.jpg",
    "card_layout": "full_width",
    "design": "bento_grid",
    "order_by": 1,
    "created_at": "2025-12-05 17:02:43.221724+00",
    "updated_at": "2025-12-05 21:13:56.357182+00",
    "status": "active",
    "subtitle": null
  },
  {
    "idx": 7,
    "era_id": "umayyad",
    "title": "Umayyad Dynasty (661–750 CE)",
    "timeline": "661–750 CE",
    "description": "The first Islamic empire, expanding its reach from Damascus",
    "icon_url": null,
    "bg_url": "https://d8kbkcbgr0qv4.cloudfront.net/era-selection/era1-bg.jpg",
    "card_layout": "full_width",
    "design": "bento_grid",
    "order_by": 2,
    "created_at": "2025-12-05 17:02:43.221724+00",
    "updated_at": "2025-12-05 21:13:56.357182+00",
    "status": "active",
    "subtitle": null
  },
  {
    "idx": 8,
    "era_id": "women_of_islam",
    "title": "Women of Islam",
    "timeline": "Various",
    "description": "Influential women throughout Islamic history",
    "icon_url": null,
    "bg_url": null,
    "card_layout": "grid",
    "design": "bento_grid",
    "order_by": 6,
    "created_at": "2025-12-05 17:02:43.221724+00",
    "updated_at": "2025-12-05 17:02:43.221724+00",
    "status": "coming_soon",
    "subtitle": null
  }
]
```

---

## Expected UI Layout (sorted by order_by)

```
┌─────────────────────────────────────┐
│  Rise of Islam (570–632 CE)         │  ← full_width, active
│  [CloudFront bg image]              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Umayyad Dynasty (661–750 CE)       │  ← full_width, active
│  [CloudFront bg image]              │
└─────────────────────────────────────┘

┌────────────────┐  ┌────────────────┐
│ Abbasid        │  │ Rashidun       │  ← grid, coming_soon (LOCKED)
│ 🔒 Coming Soon │  │ 🔒 Coming Soon │
└────────────────┘  └────────────────┘

┌────────────────┐  ┌────────────────┐
│ Al-Andalus     │  │ Women of Islam │  ← grid, coming_soon (LOCKED)
│ 🔒 Coming Soon │  │ 🔒 Coming Soon │
└────────────────┘  └────────────────┘

┌────────────────┐  ┌────────────────┐
│ Prophets       │  │ Mongol         │  ← grid, coming_soon (LOCKED)
│ 🔒 Coming Soon │  │ 🔒 Coming Soon │
└────────────────┘  └────────────────┘

┌─────────────────────────────────────┐
│  das (TEST DATA - REMOVE!)          │  ← full_width, active (INVALID)
│  [No valid bg image]                │
└─────────────────────────────────────┘
```

---

## Testing Checklist

### Data Issues to Fix
- [ ] **Delete test row:** `era_id: "new"` with title "das" is test data
- [ ] **Add bg_url:** rashidun, andalus, women_of_islam, prophets, mongol need CloudFront images

### UI Tests
- [ ] **Active eras selectable:** Rise of Islam, Umayyad can be tapped and selected
- [ ] **Locked eras show overlay:** Coming Soon eras show lock icon + "Coming Soon" text
- [ ] **Card layouts correct:** full_width eras span full width, grid eras show 2 per row
- [ ] **Order correct:** Eras sorted by order_by (1, 2, 3, 4, 5, 6, 7, 8, 9)
- [ ] **Images load:** CloudFront URLs load correctly, fallback to local for null bg_url

### Selection Flow Tests
- [ ] **Select Rise of Islam:** Green border appears, checkmark shows
- [ ] **Select Umayyad:** Previous selection clears, new selection shows
- [ ] **ENTER ERA button:** Disabled until selection, enabled after selection
- [ ] **Navigation:** Tapping ENTER ERA navigates to home tab

### Status Tests
| Status | Expected Behavior |
|--------|------------------|
| `active` | Selectable, no lock overlay |
| `premium` | Lock overlay + "Premium" badge (needs subscription) |
| `founding` | Lock overlay + "Founding Members" badge |
| `coming_soon` | Lock overlay + "Coming Soon" badge, not selectable |

---

## Feedback Notes

_Add your testing feedback below:_

### Issues Found
1.
2.
3.

### UI Improvements Needed
1.
2.
3.

### Data Changes Needed
1. Delete test row `era_id: "new"`
2.
3.
