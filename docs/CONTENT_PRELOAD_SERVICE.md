# Content Preload Service (Future Implementation)

> **Status:** Planned - Will implement once all content is finalized
> **Created:** December 2024

## Overview

Create a universal content preload service that handles ALL content types (images, videos, audio) in a single, easy-to-modify file.

## Content Types to Preload

| Type | Source Field | Priority | When to Preload |
|------|--------------|----------|-----------------|
| Era backgrounds | `eras.bg_url` | High | App launch |
| Adventure thumbnails | `content_list[].thumbnail_url` | High | Era selected |
| Adventure icons | `adventures.icon_url` | High | Era selected |
| Lesson images | `content_list[].media_url[]` | Medium | Adventure opened |
| Lesson videos | `content_list[].media_url[]` | Medium | Adventure opened |
| Background audio | `content_list[].background_music_url` | Low | On-demand only |

## Proposed Architecture

### New File: `services/ContentPreloadService.ts`

```typescript
import { Image } from 'expo-image';
import { Era } from '@/hooks/useEras';
import { Adventure } from '@/services/AdventuresContentService';

// ============================================
// CONFIGURATION - Easy to modify
// ============================================
const CONFIG = {
  enabled: true,
  images: {
    enabled: true,
    maxConcurrent: 5,
  },
  videos: {
    enabled: true,
    maxVideos: 10,
  },
  audio: {
    enabled: false,  // Disable by default - memory heavy
  },
  logging: true,
};

// ============================================
// IMAGE PRELOADING
// ============================================
class ImagePreloader {
  private preloadedUrls = new Set<string>();

  async preloadImages(urls: string[]): Promise<void> {
    if (!CONFIG.images.enabled) return;

    const newUrls = urls.filter(url =>
      url &&
      url.startsWith('http') &&
      !this.preloadedUrls.has(url)
    );

    if (CONFIG.logging) {
      console.log(`🖼️ [Preload] Starting images: ${newUrls.length} URLs`);
    }

    // Preload in batches
    for (let i = 0; i < newUrls.length; i += CONFIG.images.maxConcurrent) {
      const batch = newUrls.slice(i, i + CONFIG.images.maxConcurrent);
      await Promise.all(batch.map(url => this.prefetchImage(url)));
    }

    if (CONFIG.logging) {
      console.log(`🖼️ [Preload] Images complete: ${this.preloadedUrls.size} total`);
    }
  }

  private async prefetchImage(url: string): Promise<void> {
    try {
      await Image.prefetch(url);
      this.preloadedUrls.add(url);
    } catch (error) {
      console.warn(`🖼️ [Preload] Failed: ${url}`);
    }
  }

  extractEraImageUrls(eras: Era[]): string[] {
    return eras
      .map(era => era.bg_url)
      .filter((url): url is string => !!url && url.startsWith('http'));
  }

  extractAdventureImageUrls(adventures: Adventure[]): string[] {
    const urls: string[] = [];

    adventures.forEach(adventure => {
      // Icon
      if (adventure.icon_url) urls.push(adventure.icon_url);

      // Thumbnails and media
      adventure.content_list?.forEach(item => {
        if (item.thumbnail_url) urls.push(item.thumbnail_url);

        // Only images from image_carousel
        if (item.content_type === 'image_carousel' && item.media_url) {
          urls.push(...item.media_url);
        }
      });
    });

    return urls.filter(url => url && url.startsWith('http'));
  }

  getPreloadedCount(): number {
    return this.preloadedUrls.size;
  }
}

// ============================================
// VIDEO PRELOADING
// ============================================
class VideoPreloader {
  extractVideoUrls(adventures: Adventure[]): string[] {
    const urls: string[] = [];

    adventures.forEach(adventure => {
      adventure.content_list?.forEach(item => {
        if (['reel', 'video_carousel'].includes(item.content_type) && item.media_url) {
          urls.push(...item.media_url);
        }
      });
    });

    return urls.filter(url => url && url.startsWith('http'));
  }
}

// ============================================
// MAIN SERVICE
// ============================================
class ContentPreloadService {
  private imagePreloader = new ImagePreloader();
  private videoPreloader = new VideoPreloader();

  // Called when eras load
  async preloadEraContent(eras: Era[]): Promise<void> {
    if (!CONFIG.enabled) return;

    const imageUrls = this.imagePreloader.extractEraImageUrls(eras);
    await this.imagePreloader.preloadImages(imageUrls);
  }

  // Called when adventures load
  async preloadAdventureContent(adventures: Adventure[]): Promise<void> {
    if (!CONFIG.enabled) return;

    const imageUrls = this.imagePreloader.extractAdventureImageUrls(adventures);
    await this.imagePreloader.preloadImages(imageUrls);

    // Videos handled by existing useVideoPreloader hook
  }

  // Status check
  getStatus() {
    return {
      images: this.imagePreloader.getPreloadedCount(),
    };
  }
}

export const contentPreloadService = new ContentPreloadService();
```

## Integration Points

### 1. `hooks/useEras.ts`

```typescript
import { contentPreloadService } from '@/services/ContentPreloadService';

// In fetchEras, after setEras(data):
contentPreloadService.preloadEraContent(data);
```

### 2. `services/AdventuresContentService.ts`

```typescript
import { contentPreloadService } from '@/services/ContentPreloadService';

// After loading adventures:
contentPreloadService.preloadAdventureContent(adventures);
```

## URL Patterns (CloudFront)

| Content Type | Path Pattern | Example |
|--------------|--------------|---------|
| Reel Video | `/Reel+Videos/Adv{N}_M{N}_Reel{N}.mp4` | `/Reel+Videos/Adv1_M1_Reel1.mp4` |
| Carousel Video | `/carouselvideos/Adv{N}_M{N}...mp4` | `/carouselvideos/Adv1_M1_Video1.mp4` |
| Carousel Image | `/Images/Adv{N}_M{N}_Img{NN}.jpg` | `/Images/Adv4_M2_Img01.jpg` |
| Background Audio | `/Audios/Adv{N}_M{N}_L{N}.mp3` | `/Audios/Adv4_M2_L2.mp3` |

Base URL: `https://dzyjrzj2lngmg.cloudfront.net`

## Console Logs

When enabled, the service logs:

```
🖼️ [Preload] Starting images: 8 URLs
🖼️ [Preload] Images complete: 8 total
📹 [Preload] Videos handled by useVideoPreloader
```

## Files to Create/Modify

| File | Action |
|------|--------|
| `services/ContentPreloadService.ts` | CREATE |
| `hooks/useEras.ts` | MODIFY - Add preload call |
| `services/AdventuresContentService.ts` | MODIFY - Add preload call |

## Benefits

1. **Single file** - All preload logic in one place
2. **Easy config** - Toggle content types on/off at top of file
3. **Extensible** - Add new content types easily
4. **Logging** - Track what's being preloaded
5. **No duplication** - Tracks already-preloaded URLs
6. **Respects existing patterns** - Works with existing `useVideoPreloader` hook

## Notes

- Audio preloading is disabled by default (memory intensive)
- Videos continue to use existing `useVideoPreloader` hook
- Image preloading uses `expo-image`'s built-in `Image.prefetch()`
- Service is a singleton - same instance across app
