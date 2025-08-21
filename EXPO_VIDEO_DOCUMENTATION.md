# Video Implementation - expo-video Documentation

## Project Video Strategy

**Archives Expo uses expo-video for all video playback functionality.**

expo-video is a cross-platform, performant video component for React Native and Expo with Web support.

---

## expo-video Documentation

**Package**: `expo-video`  
**Platforms**: Android, iOS, Web, tvOS  
**Source**: https://github.com/expo/expo/tree/main/packages/expo-video

### Known Issues (Android)

When two `VideoView` components are overlapping and have the `contentFit` prop set to `cover`, one of the videos may be displayed out of bounds. This is a known upstream issue. 

**Workaround**: Use the `surfaceType` prop and set it to `textureView`.

## Installation

```bash
npx expo install expo-video
```

## Configuration in app.json

```json
{
  "expo": {
    "plugins": [
      [
        "expo-video",
        {
          "supportsBackgroundPlayback": true,
          "supportsPictureInPicture": true
        }
      ]
    ]
  }
}
```

### Configuration Properties

- **`supportsBackgroundPlayback`** (iOS): Enables background playback by adding the `audio` key to `UIBackgroundModes` array
- **`supportsPictureInPicture`**: Enables Picture-in-Picture on Android and iOS

## Basic Usage

```jsx
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet, View, Button } from 'react-native';

const videoSource = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

export default function VideoScreen() {
  const player = useVideoPlayer(videoSource, player => {
    player.loop = true;
    player.play();
  });

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  return (
    <View style={styles.contentContainer}>
      <VideoView 
        style={styles.video} 
        player={player} 
        allowsFullscreen 
        allowsPictureInPicture 
      />
      <View style={styles.controlsContainer}>
        <Button
          title={isPlaying ? 'Pause' : 'Play'}
          onPress={() => {
            if (isPlaying) {
              player.pause();
            } else {
              player.play();
            }
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 50,
  },
  video: {
    width: 350,
    height: 275,
  },
  controlsContainer: {
    padding: 10,
  },
});
```

## Event Handling

The `VideoPlayer` properties do not update React state automatically. Use events to track player state changes.

### 1. `useEvent` Hook (Recommended)

Creates a stateful listener with automatic cleanup:

```tsx
import { useEvent } from 'expo';

const { status, error } = useEvent(player, 'statusChange', { status: player.status });
```

### 2. `useEventListener` Hook

Event listener with automatic cleanup:

```tsx
import { useEventListener } from 'expo';

useEventListener(player, 'statusChange', ({ status, error }) => {
  setPlayerStatus(status);
  setPlayerError(error);
  console.log('Player status changed: ', status);
});
```

### 3. `Player.addListener` Method

Manual event handling (requires cleanup):

```tsx
useEffect(() => {
  const subscription = player.addListener('statusChange', ({ status, error }) => {
    setPlayerStatus(status);
    setPlayerError(error);
  });

  return () => {
    subscription.remove();
  };
}, []);
```

## Local Media from Assets

Support for local media using `require()`:

```tsx
import { VideoSource } from 'expo-video';

const assetId = require('./assets/bigbuckbunny.mp4');

const videoSource: VideoSource = {
  assetId,
  metadata: {
    title: 'Big Buck Bunny',
    artist: 'The Open Movie Project',
  },
};

const player1 = useVideoPlayer(assetId); // Direct usage
const player2 = useVideoPlayer(videoSource); // With metadata
```

## Video Preloading

Load videos before displaying for smoother transitions:

```tsx
import { useVideoPlayer, VideoView, VideoSource } from 'expo-video';
import { useState, useCallback } from 'react';

const bigBuckBunnySource: VideoSource =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

const elephantsDreamSource: VideoSource =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4';

export default function PreloadingVideoPlayerScreen() {
  const player1 = useVideoPlayer(bigBuckBunnySource, player => {
    player.play();
  });

  const player2 = useVideoPlayer(elephantsDreamSource, player => {
    player.currentTime = 20;
  });

  const [currentPlayer, setCurrentPlayer] = useState(player1);

  const replacePlayer = useCallback(async () => {
    currentPlayer.pause();
    if (currentPlayer === player1) {
      setCurrentPlayer(player2);
      player1.pause();
      player2.play();
    } else {
      setCurrentPlayer(player1);
      player2.pause();
      player1.play();
    }
  }, [player1, currentPlayer]);

  return (
    <View style={styles.contentContainer}>
      <VideoView player={currentPlayer} style={styles.video} nativeControls={false} />
      <TouchableOpacity style={styles.button} onPress={replacePlayer}>
        <Text style={styles.buttonText}>Replace Player</Text>
      </TouchableOpacity>
    </View>
  );
}
```

## Direct VideoPlayer Creation

For advanced use cases (manual lifecycle management):

```tsx
import { createVideoPlayer } from 'expo-video';

const player = createVideoPlayer(videoSource);
// ⚠️ Must call player.release() when done to prevent memory leaks
```

> **Warning**: On Android, mounting multiple `VideoView` components with the same `VideoPlayer` instance will not work due to platform limitations.

## Video Caching

Cache videos to minimize network usage and enhance user experience:

```tsx
const videoSource: VideoSource = {
  uri: 'https://example.com/video.mp4',
  useCaching: true, // Enable caching
};
```

### Cache Features

- **Persistent cache**: Cleared on least-recently-used basis
- **Offline playback**: Cached videos can play offline
- **Platform limitations**: 
  - No HLS caching on iOS
  - No DRM-protected video caching

### Cache Management

```tsx
import { setVideoCacheSizeAsync, getCurrentVideoCacheSize, clearVideoCacheAsync } from 'expo-video';

// Set preferred cache size (default: 1GB)
await setVideoCacheSizeAsync(2 * 1024 * 1024 * 1024); // 2GB

// Get current cache size
const currentSize = await getCurrentVideoCacheSize();

// Clear all cached videos
await clearVideoCacheAsync();
```

## API Import

```js
import { VideoView, useVideoPlayer } from 'expo-video';
```

---

## Archives Expo Implementation Notes

- **Video playback**: expo-video for all video components
- **Background audio**: expo-av (due to expo-audio compatibility issues with AWS CloudFront)
- **AWS CloudFront**: Used for video and audio asset delivery
- **Lesson components**: Use expo-video for educational content playback

### Key Components Using expo-video

- `LessonPlayer.tsx` - Shared video player component
- Adventure lesson components with video content
- Video carousel components

### Performance Considerations

- Use preloading for sequential video content
- Enable caching for frequently accessed videos
- Manage player lifecycle properly to prevent memory leaks