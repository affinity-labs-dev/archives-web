// AIChatModal.tsx - AI chat interface (Ibu - AI Assistant)
import ArchivesTheme from '@/constants/ArchivesTheme';
import { useAI } from '@/gamification';
import { aiService, aiStorageService } from '@/gamification';
import type { StoredMessage, WebSearchSource } from '@/gamification';
import { analyticsService } from '@/services/AnalyticsService';
import { useUser } from '@clerk/clerk-expo';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { Ionicons } from '@expo/vector-icons';
import {
  cacheDirectory,
  writeAsStringAsync,
  deleteAsync,
  EncodingType,
} from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Rive, { Alignment, Fit } from 'rive-react-native';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Animated, {
  Easing,
  withTiming,
  type EntryAnimationsValues,
  type ExitAnimationsValues,
  type LayoutAnimation,
} from 'react-native-reanimated';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polygon } from 'react-native-svg';
import { renderMarkdownText } from '@/utils/markdownText';
import { Typewriter } from '@/components/ui/Typewriter';
import { useTypewriter } from '@/components/ui/Typewriter/useTypewriter';
import { Typography } from '@/components/ui/Typography';
import { DepthButton } from '@/components/ui/DepthButton';
import { colors, easings } from '@/components/ui/theme';
import { AnimatedEntrance } from '@/components/ui/animations';

// Welcome-screen character — animated Ibu teacher (Rive replaces the
// previous static `hellocharacter.png`). Larger asset (~5.6MB) but
// only loads when the AI chat modal opens, so cold-start budget is
// unaffected.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ibuTeacherRive = require('@/assets/rive/ibu_teacher.riv');
// AI avatar for chat messages
const AIChatIcon = require('@/assets/images/ai-images/sayhi.png');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Custom layout-animation worklets — direct port of the mock's
// chat-intro collapse + message append from `Downloads/03 questions/
// index.html` (`collapseChatIntro()` + `appendChatMessage()`).
//
// Reanimated's built-in presets get close (`FadeOut`, `FadeInUp`)
// but each diverges from the mock in one important way:
//   - `FadeOut` only animates opacity → the welcome's vertical slot
//     persists for the full 320ms, blocking messages from sliding
//     up into the freed space until the unmount snap. The mock's
//     `height: 0` is what makes the transition feel continuous, not
//     a fade followed by a layout jump.
//   - `FadeInUp` defaults to a 25–50px Y offset, but the mock's
//     `appendChatMessage` enters from y:14 specifically. Custom
//     worklet lets us match the offset and easing exactly.
//
// Both are `'worklet'`-marked so Reanimated runs them on the UI
// thread; never inline non-worklet helpers here, the layout-
// animation runtime will reject them.
const collapseExit = (values: ExitAnimationsValues): LayoutAnimation => {
  'worklet';
  return {
    initialValues: {
      opacity: 1,
      height: values.currentHeight,
    },
    animations: {
      opacity: withTiming(0, { duration: 320, easing: Easing.inOut(Easing.quad) }),
      height: withTiming(0, { duration: 320, easing: Easing.inOut(Easing.quad) }),
    },
  };
};

const messageEnter = (_values: EntryAnimationsValues): LayoutAnimation => {
  'worklet';
  return {
    initialValues: {
      opacity: 0,
      transform: [{ translateY: 14 }],
    },
    animations: {
      opacity: withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) }),
      transform: [
        { translateY: withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) }) },
      ],
    },
  };
};

// Subtle exit — used by the "thinking..." loading bubble when it
// unmounts as the AI reply lands. 180ms power2.in is faster than
// the 300ms enter on purpose: exits should feel like the bubble
// "got out of the way", not a peer event with the entering reply.
// Pure opacity (no Y translate) keeps the AI message's slide-up
// from competing with the loading bubble's slide-out — they
// occupy the same row in the scroll, and dual translates would
// look like jitter.
const messageExit = (_values: ExitAnimationsValues): LayoutAnimation => {
  'worklet';
  return {
    initialValues: { opacity: 1 },
    animations: {
      opacity: withTiming(0, { duration: 180, easing: Easing.in(Easing.quad) }),
    },
  };
};

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  // Optional image data for generated images (assistant) or uploaded images (user)
  image?: {
    base64: string;
    mimeType: string;
  };
  // URL for persisted images (loaded from storage)
  imageUrl?: string;
  // Flag to indicate if this is an uploaded image (user) vs generated (assistant)
  isUploadedImage?: boolean;
  // Web search sources from Google Search grounding
  sources?: WebSearchSource[];
  // Quiz context for Chat to Learn responses (displayed as a banner above the message)
  quizContext?: {
    title: string;
    eraName: string;
    score: string;
  };
  // Hidden messages are included in conversation history for AI context but not rendered in UI
  hidden?: boolean;
  // AI-generated follow-up question suggestions (only on assistant messages)
  suggestedFollowUps?: string[];
}

interface AIChatModalProps {
  visible: boolean;
  onClose: () => void;
  initialMessages?: ChatMessage[];
  context?: {
    eraId?: string;
    eraName?: string;
    adventureId?: string;
    currentScreen?: string;
  };
}

/**
 * Progressive markdown reveal — fixes the visual jump that happened
 * when the previous `<Typewriter>` (which renders via Typography
 * variant=body.m) handed off to `renderMarkdownText` (raw `<Text>`
 * with `styles.assistantText` font Onest 15/21). Two different
 * components meant a font/size/weight switch on completion → text
 * reflowed and bold tokens (`**...**`) snapped into bold style only
 * after the typewriter ended.
 *
 * The fix: drive the same `useTypewriter` hook the Typewriter uses
 * (so cadence + reduce-motion semantics stay identical), but pipe
 * each progressive slice through `renderMarkdownText` — the SAME
 * renderer used after completion. The styling is now byte-identical
 * during streaming and after, eliminating the snap. Bold/emphasis
 * also formats as you type — the moment the closing `**` arrives,
 * that segment renders bold inline, no reflow.
 *
 * The cursor is a literal `|` glyph appended to the slice (instead
 * of a separate Animated.Text node, which the legacy Typewriter
 * used). That keeps the cursor in the same Text flow as the body
 * so its appearance/disappearance doesn't trigger a rewrap of the
 * last line. Production-grade streaming would consume Gemini's SSE
 * stream in chunks; this is the polyfill until the backend exposes
 * a `/ai/chat/stream` endpoint that returns chunked content.
 */
function StreamingAssistantMessage({
  text,
  textStyle,
  onComplete,
  onTick,
}: {
  text: string;
  textStyle: TextStyle;
  onComplete?: () => void;
  /**
   * Fires after every character reveal. The parent uses this to
   * scroll the chat to bottom so the growing bubble stays visible
   * (`appendChatMessage` in the mock does the same with
   * `scrollChatToBottom(screenEl)` every 24 chars). Pass a stable
   * `useCallback` reference so the effect below doesn't re-fire
   * on every parent render.
   */
  onTick?: () => void;
}) {
  // `speed` is the ms-interval BETWEEN characters (not chars-per-
  // second). 22ms ≈ 45 cps matched the mock's `typeInto(..., 45,
  // ...)`, but in-app testing showed it reads "thoughtful" rather
  // than "responsive" — closer to a human typing than to AI
  // streaming. 10ms ≈ 100 cps is the sweet spot used by ChatGPT /
  // Claude web for visible-char streaming: fast enough to feel
  // generative, slow enough that users can read along without the
  // text just appearing instantly.
  const { displayText, showCursor } = useTypewriter({
    text,
    speed: 10,
    onComplete,
  });
  // Notify parent every time displayText grows so the chat can
  // auto-scroll. Effect is keyed on `displayText.length` (not
  // `displayText` content) so re-renders that don't grow the slice
  // (theoretical — useTypewriter only appends) don't waste a tick.
  useEffect(() => {
    onTick?.();
  }, [displayText.length, onTick]);
  return renderMarkdownText(displayText + (showCursor ? '|' : ''), textStyle);
}

/**
 * Follow-up suggestion pills rendered below the most recent assistant
 * message. Reveals AFTER the typewriter finishes (parent gates via
 * `visible` prop) so suggestions don't compete with the streaming
 * text for attention.
 *
 * Each pill animates in with a 60ms stagger — matches the welcome-
 * screen suggestions pattern (line ~1180) so the feel is consistent.
 * Tap behavior: send the suggestion as a user message immediately
 * (no edit step), per product decision (matches welcome behavior).
 */
function FollowUpSuggestions({
  suggestions,
  visible,
  onPress,
}: {
  suggestions: string[];
  visible: boolean;
  onPress: (suggestion: string, index: number) => void;
}) {
  if (!visible || suggestions.length === 0) return null;

  return (
    <View style={styles.followUpContainer}>
      {suggestions.slice(0, 2).map((suggestion, index) => (
        <AnimatedEntrance
          key={`${suggestion}-${index}`}
          preset={{
            translateY: { from: 12, to: 0 },
            opacity: { from: 0, to: 1 },
            duration: 280,
            easing: easings.power2Out,
          }}
          delay={index * 60}
        >
          <DepthButton
            variant="secondary"
            size="medium"
            surfaceColor="snow"
            shadowColor="acaiTertiary"
            borderColor="acaiPrimary"
            radius={22}
            shadowOffset={4}
            pressEffect="dip"
            onPress={() => onPress(suggestion, index)}
          >
            <Typography variant="label.xs" weight="600" color="onyx">
              {suggestion}
            </Typography>
          </DepthButton>
        </AnimatedEntrance>
      ))}
    </View>
  );
}

export default function AIChatModal({
  visible,
  onClose,
  initialMessages = [],
  context = {},
}: AIChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ID of the AI message currently being typewritten (only the latest AI reply animates)
  const [typewriterMsgId, setTypewriterMsgId] = useState<string | null>(null);

  // Image viewer state
  const [selectedImage, setSelectedImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Image upload state
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ base64: string; mimeType: string; uri: string } | null>(null);

  // Header menu state
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  // Tracks which userId we've already loaded chat history for, so that
  // load fires exactly once per (visible × userId) pair and never
  // re-fires when local state empties (e.g. after Clear Chat). The
  // previous gate `messages.length === 0` was a state-derived condition
  // — `setMessages([])` from clear flipped it back to true, which raced
  // against the in-flight Supabase DELETE and reloaded stale messages.
  // Symptom: first Clear after a long conversation appeared to "fail",
  // killing+reopening let the second Clear succeed because state was
  // already empty by then so the load effect didn't re-fire.
  // Switching to a userId-keyed ref breaks the link between local
  // emptiness and re-loading; account-switch still re-loads because
  // the ref no longer matches the new userId.
  const lastLoadedUserIdRef = useRef<string | null>(null);
  // Defensive guard: while a Clear operation is in flight, suppress
  // any potential load attempt. Belt-and-suspenders next to the ref
  // gate above — protects against future deps changes accidentally
  // re-triggering the load effect during the brief window between
  // setMessages([]) and clearMessages() completing in Supabase.
  const isClearingRef = useRef(false);

  // Auto-follow flag for streaming text. `true` while the user is at
  // (or near) the bottom of the chat — the scroll view auto-pins to
  // the bottom on every typewriter tick. The user can break out of
  // auto-follow by scrolling up to read older messages; once they
  // scroll back down to the bottom, auto-follow resumes. Reset to
  // `true` whenever a NEW AI reply starts streaming (`typewriterMsgId`
  // flips from null → non-null) so a new message always pulls focus.
  // Standard "follow tail" pattern from chat UIs (Slack, ChatGPT web).
  const userIsAtBottomRef = useRef(true);

  // Gesture-driven flag updates (NOT per-frame `onScroll`).
  //
  // Earlier this file used `onScroll` to recompute `userIsAtBottomRef`
  // on every scroll frame — but `scrollToEnd` from typewriter ticks
  // ALSO fires `onScroll`, so the flag stayed `true` during streaming
  // even when the user was trying to drag away from the bottom. The
  // result was the user fighting the typewriter: every 10ms tick
  // pulled the scroll back to bottom, cancelling their drag → "jitter
  // / phải scroll mạnh mới scroll lên được" feedback.
  //
  // The fix: only update the flag on USER GESTURE boundaries
  // (`onScrollBeginDrag` / `onScrollEndDrag` / `onMomentumScrollEnd`).
  // The moment the user touches the scroll view we yield control by
  // setting `false` immediately — typewriter ticks skip the
  // `scrollToEnd` call from then on, so the drag is unopposed.
  // After release we re-evaluate at the settled position so users
  // who scroll back to the bottom resume auto-follow naturally.
  const handleScrollBeginDrag = useCallback(() => {
    userIsAtBottomRef.current = false;
  }, []);

  const evaluateScrollPosition = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const distanceFromBottom =
        contentSize.height - (contentOffset.y + layoutMeasurement.height);
      // 60px threshold tolerates iOS scroll inertia + safe-area
      // chrome. Strict equality flips false on every bounce at the
      // bottom edge.
      userIsAtBottomRef.current = distanceFromBottom < 60;
    },
    [],
  );

  const handleStreamTick = useCallback(() => {
    if (!userIsAtBottomRef.current) return;
    // `animated: false` is intentional — animated scrolls stack into
    // a queue when called every ~10ms, lagging behind the typewriter.
    // Instant scroll keeps the bubble pinned to the bottom edge as
    // text fills the line.
    scrollViewRef.current?.scrollToEnd({ animated: false });
  }, []);

  // When a NEW AI reply begins streaming, force auto-follow back on
  // so the new message pulls into view even if the user had scrolled
  // up while reading the previous one. Mirrors the mock's implicit
  // behavior of always calling `scrollChatToBottom` after each
  // `appendChatMessage`.
  useEffect(() => {
    if (typewriterMsgId) userIsAtBottomRef.current = true;
  }, [typewriterMsgId]);

  const { getUserProgressSummary, getKnowledgeContextForPrompt, pendingHiddenMessage, clearPendingHiddenMessage, currentSessionId, chatTrigger } = useAI();
  const { user } = useUser();
  const { isSubscribed } = useRevenueCat();
  const insets = useSafeAreaInsets();

  // Analytics: track when chat was opened and response timing
  const chatOpenedAtRef = useRef<number>(0);
  const responseStartRef = useRef<number>(0);

  // Get user's first name for personalized greeting
  const userName = user?.firstName || 'Explorer';
  const userId = user?.id;

  // Load persisted messages when modal opens.
  //
  // Gate is `lastLoadedUserIdRef.current !== userId` (not the legacy
  // `messages.length === 0`). See ref declaration above for why —
  // state-derived gate raced with Clear Chat's Supabase DELETE.
  //
  // Re-fires only when:
  //   1. Modal opens for the first time after mount (ref is null)
  //   2. User switches Clerk account (userId changes — ref no longer matches)
  // It does NOT re-fire when:
  //   - User clears chat (messages.length goes N→0 but ref unchanged)
  //   - User closes and reopens the modal (ref still matches userId)
  useEffect(() => {
    const loadMessages = async () => {
      if (!userId) return;

      setIsLoadingHistory(true);
      try {
        const userData = await aiStorageService.loadUserData(userId);
        if (userData?.messages && userData.messages.length > 0) {
          const loadedMessages: ChatMessage[] = userData.messages.map((msg: StoredMessage) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
            // Validate quizContext shape — corrupted data could crash rendering
            quizContext: (msg.quizContext?.title && msg.quizContext?.eraName && msg.quizContext?.score)
              ? msg.quizContext
              : undefined,
          }));
          setMessages(loadedMessages);
          console.log('📚 [AIChatModal] Loaded', loadedMessages.length, 'messages from history');
        }
      } catch (err) {
        console.error('❌ [AIChatModal] Failed to load history:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    if (
      visible &&
      userId &&
      !isClearingRef.current &&
      lastLoadedUserIdRef.current !== userId
    ) {
      lastLoadedUserIdRef.current = userId;
      loadMessages();
    }
  }, [visible, userId]);

  // Save messages to storage
  const saveMessages = async (updatedMessages: ChatMessage[]) => {
    if (!userId || updatedMessages.length === 0) return;

    // Convert to storage format (Date -> string, remove base64 if we have URL)
    const storedMessages: StoredMessage[] = updatedMessages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp.toISOString(),
      imageUrl: msg.imageUrl,
      isUploadedImage: msg.isUploadedImage,
      quizContext: msg.quizContext,
      hidden: msg.hidden,
      suggestedFollowUps: msg.suggestedFollowUps,
    }));

    await aiStorageService.saveMessages(userId, storedMessages);
  };

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      // Auto-save messages when they change (skip initial load)
      if (!isLoadingHistory) {
        saveMessages(messages);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    if (visible) {
      chatOpenedAtRef.current = Date.now();
      analyticsService.trackAIChatOpened({
        trigger: chatTrigger,
        era_id: context?.eraId || 'unknown_era',
        adventure_id: context?.adventureId,
        message_count: messages.length,
        session_id: currentSessionId || undefined,
      });

      // Scroll to latest message when modal opens
      if (messages.length > 0) {
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 100);
      }
    }
  }, [visible]);

  // Chat to Learn: process hidden message when modal opens
  // Sends the context to AI silently (not shown in chat) and displays only the AI response
  useEffect(() => {
    if (!visible || !pendingHiddenMessage) return;
    let cancelled = false;

    const processHiddenMessage = async () => {
      // Capture message before clearing — clearing changes the dependency which
      // would trigger effect cleanup and cancel this in-flight async operation
      const messageToSend = pendingHiddenMessage;
      setIsLoading(true);
      setError(null);

      // Parse quiz context from hidden message for the context banner
      // Two formats from QuizResults.tsx:
      //   Imperfect: 'quiz on "Title" in EraName. I got X/Y correct (Z%).'
      //   Perfect:   'quiz on "Title" in EraName and got all X questions correct (Z%)!'
      let quizContext: ChatMessage['quizContext'] | undefined;
      const imperfectMatch = messageToSend.match(/quiz on "([^"]+)" in ([^.]+)\. I got (\d+\/\d+ correct \(\d+%\))/);
      const perfectMatch = messageToSend.match(/quiz on "([^"]+)" in ([^.]+) and got all (\d+) questions correct \((\d+%)\)/);
      if (imperfectMatch) {
        quizContext = {
          title: imperfectMatch[1],
          eraName: imperfectMatch[2],
          score: imperfectMatch[3],
        };
      } else if (perfectMatch) {
        quizContext = {
          title: perfectMatch[1],
          eraName: perfectMatch[2],
          score: `${perfectMatch[3]}/${perfectMatch[3]} correct (${perfectMatch[4]})`,
        };
      }

      // Check quota before making the API call
      if (!await checkQuotaBeforeRequest('chat')) {
        setIsLoading(false);
        clearPendingHiddenMessage();
        return;
      }

      try {
        const progressSummary = getUserProgressSummary();
        const knowledgeCtx = getKnowledgeContextForPrompt();
        const response = await aiService.getChatResponse({
          userMessage: messageToSend,
          conversationHistory: messages,
          context: {
            eraId: context.eraId,
            eraName: context.eraName || 'Islamic History',
            adventureId: context.adventureId,
            currentScreen: context.currentScreen,
          },
          userProgress: progressSummary,
          knowledgeContext: knowledgeCtx,
          enableWebSearch: false,
        });

        if (cancelled) return;

        // Store the hidden message in history so follow-up questions retain quiz context
        const hiddenMsg: ChatMessage = {
          id: `${Date.now()}_hidden_${Math.random().toString(36).slice(2)}`,
          role: 'user',
          content: messageToSend,
          timestamp: new Date(),
          hidden: true,
        };

        const aiMsg: ChatMessage = {
          id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
          role: 'assistant',
          content: response.text,
          timestamp: new Date(),
          quizContext,
          suggestedFollowUps: response.suggestedFollowUps,
        };

        setMessages((prev) => [...prev, hiddenMsg, aiMsg]);

        // Track usage against quota
        if (userId) {
          aiStorageService.trackUsage(userId, 'chat').catch(console.error);
        }

        analyticsService.trackCustomEvent('chat_to_learn_response', {
          era_id: context?.eraId || 'unknown_era',
          response_length: response.text.length,
        });
      } catch (err) {
        if (cancelled) return;
        console.error('❌ [AIChatModal] Chat to Learn error:', err);
        setError('Sorry, I could not process that. Please try again.');
      } finally {
        // Always clear pending message to prevent ghost re-trigger on next modal open
        clearPendingHiddenMessage();
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    processHiddenMessage();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, pendingHiddenMessage]);

  // Share image (allows saving to photos, sharing to apps, etc.)
  const handleShareImage = async () => {
    if (!selectedImage) return;

    // Sharing is only supported on iOS and Android
    if (Platform.OS === 'web') {
      Alert.alert('Not Supported', 'Sharing images is only available on mobile devices.');
      return;
    }

    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Not Available', 'Sharing is not available on this device.');
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Create a temporary file - cacheDirectory is guaranteed on iOS/Android
      const filename = `archives_ai_${Date.now()}.png`;
      const fileUri = cacheDirectory + filename;

      // Write base64 to file
      await writeAsStringAsync(fileUri, selectedImage.base64, {
        encoding: EncodingType.Base64,
      });

      // Open share sheet - user can save to photos, share to apps, etc.
      await Sharing.shareAsync(fileUri, {
        mimeType: 'image/png',
        dialogTitle: 'Share or Save Image',
      });

      // Clean up temp file after sharing
      await deleteAsync(fileUri, { idempotent: true });

      analyticsService.trackCustomEvent('ai_image_shared', {
        era_id: context?.eraId || 'unknown_era',
      });
    } catch (err) {
      console.error('❌ [AIChatModal] Error sharing image:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to share image. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Pick image from library
  const handlePickImage = async () => {
    setShowActionMenu(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Small delay to let iOS modal animation complete before launching picker
    await new Promise((resolve) => setTimeout(resolve, Platform.OS === 'ios' ? 400 : 100));

    try {
      // Request permissions on iOS (best practice for better UX)
      if (Platform.OS === 'ios') {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
          Alert.alert(
            'Permission Required',
            'Please allow access to your photos in Settings to upload images.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          setPendingImage({
            base64: asset.base64,
            mimeType: asset.mimeType || 'image/jpeg',
            uri: asset.uri,
          });
          analyticsService.trackCustomEvent('ai_image_selected', {
            era_id: context?.eraId || 'unknown_era',
            source: 'library',
          });
        }
      }
    } catch (err) {
      console.error('❌ [AIChatModal] Error picking image:', err);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Clear pending image
  const handleClearPendingImage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPendingImage(null);
  };

  // Handle quick prompt from action menu
  const handleQuickPrompt = (prompt: string) => {
    setShowActionMenu(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleSend(prompt);
  };

  // Handle clear chat history
  const handleClearHistory = () => {
    setShowHeaderMenu(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Clear Chat History',
      'Are you sure you want to clear all messages? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            // Set guard BEFORE clearing local state. Even though the
            // load effect's primary gate (lastLoadedUserIdRef) already
            // prevents re-loading, this guarantees protection if the
            // effect deps array changes in the future. Reset only
            // after the Supabase DELETE has fully committed.
            isClearingRef.current = true;
            try {
              setMessages([]);
              if (userId) {
                await aiStorageService.clearMessages(userId);
              }
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } finally {
              isClearingRef.current = false;
            }
          },
        },
      ]
    );
  };

  // Helper to check quota and show error if exceeded
  const checkQuotaBeforeRequest = async (
    requestType: 'chat' | 'image_generate' | 'image_edit' | 'image_analyze'
  ): Promise<boolean> => {
    if (!userId) return true; // Allow if no user (shouldn't happen)

    const quotaCheck = await aiStorageService.checkQuota(userId, requestType, isSubscribed);

    if (!quotaCheck.allowed) {
      const typeLabel = requestType === 'chat' ? 'messages' :
                        requestType === 'image_generate' ? 'image generations' :
                        requestType === 'image_edit' ? 'image edits' : 'image analyses';

      setError(
        `You have reached your monthly limit of ${quotaCheck.limit} ${typeLabel}. ` +
        `Your quota resets on ${quotaCheck.resetDate}. ` +
        (isSubscribed ? '' : 'Upgrade to Premium for higher limits!')
      );

      analyticsService.trackAIChatQuotaReached({
        request_type: requestType,
        messages_used: quotaCheck.limit - quotaCheck.remaining,
        quota_limit: quotaCheck.limit,
        is_subscriber: isSubscribed,
      });

      return false;
    }

    return true;
  };

  const handleSend = async (messageToSend?: string) => {
    const userMessage = (messageToSend || inputText).trim();
    const hasImage = pendingImage !== null;

    // Need either a message or an image to send
    if ((!userMessage && !hasImage) || isLoading) return;

    Keyboard.dismiss();
    setInputText('');
    setError(null);

    // Create user message with optional image
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage || 'What can you tell me about this image?',
      timestamp: new Date(),
      ...(hasImage && {
        image: {
          base64: pendingImage.base64,
          mimeType: pendingImage.mimeType,
        },
        isUploadedImage: true,
      }),
    };

    // Clear pending image before async operations
    const imageToAnalyze = pendingImage;
    setPendingImage(null);

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Track ai_chat_message_sent (was broken since Dec 2025)
    analyticsService.trackAIChatMessageSent({
      era_id: context?.eraId || 'unknown_era',
      message_type: pendingImage ? 'image' : 'text',
      message_length: userMessage.length,
      is_first_message: messages.length === 0,
      session_id: currentSessionId || undefined,
    });

    // Start response timer for response_time_ms tracking
    responseStartRef.current = Date.now();

    try {
      // If user uploaded an image, check if they want editing or analysis
      if (imageToAnalyze) {
        const isEditRequest = userMessage && aiService.isImageEditRequest(userMessage);

        if (isEditRequest) {
          // Check quota before image edit
          if (!await checkQuotaBeforeRequest('image_edit')) {
            setIsLoading(false);
            return;
          }

          // User wants to edit/transform their photo
          setIsGeneratingImage(true);
          console.log('✏️ [AIChatModal] Image edit request detected');

          const editResult = await aiService.editImage({
            imageBase64: imageToAnalyze.base64,
            mimeType: imageToAnalyze.mimeType,
            editPrompt: userMessage,
            context: {
              eraName: context.eraName,
              adventureId: context.adventureId,
            },
          });

          if (editResult) {
            const aiMsg: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: editResult.caption || 'Here is your transformed image:',
              timestamp: new Date(),
              image: {
                base64: editResult.imageBase64,
                mimeType: editResult.mimeType,
              },
            };

            // Show image immediately
            setMessages((prev) => [...prev, aiMsg]);
            analyticsService.trackCustomEvent('ai_image_edited', {
              era_id: context?.eraId || 'unknown_era',
            });

            // Background: Upload image, save URL, and track usage
            if (userId) {
              const messageId = aiMsg.id;
              aiStorageService.uploadImage(userId, editResult.imageBase64, 'edited').then((imageUrl) => {
                if (imageUrl) {
                  // Update message with URL so it persists
                  setMessages((prev) => prev.map((m) =>
                    m.id === messageId ? { ...m, imageUrl } : m
                  ));
                }
              }).catch(console.error);
              aiStorageService.trackUsage(userId, 'image_edit').catch(console.error);
            }
          } else {
            throw new Error('Failed to edit image');
          }
        } else {
          // Check quota before image analysis
          if (!await checkQuotaBeforeRequest('image_analyze')) {
            setIsLoading(false);
            return;
          }

          // User wants to analyze/ask about the image
          setIsAnalyzingImage(true);
          console.log('🔍 [AIChatModal] Analyzing uploaded image...');

          const response = await aiService.analyzeImage({
            imageBase64: imageToAnalyze.base64,
            mimeType: imageToAnalyze.mimeType,
            userMessage: userMessage || undefined,
            context: {
              eraName: context.eraName,
              adventureId: context.adventureId,
            },
          });

          const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response,
            timestamp: new Date(),
          };

          // Show response immediately
          setTypewriterMsgId(aiMsg.id);
          setMessages((prev) => [...prev, aiMsg]);
          analyticsService.trackCustomEvent('ai_image_analyzed', {
            era_id: context?.eraId || 'unknown_era',
            has_question: !!userMessage,
          });

          // Background: Track usage (non-blocking)
          if (userId) {
            aiStorageService.trackUsage(userId, 'image_analyze').catch(console.error);
          }
        }
      }
      // Check if user is requesting image generation
      else if (aiService.isImageRequest(userMessage)) {
        // Check quota before image generation
        if (!await checkQuotaBeforeRequest('image_generate')) {
          setIsLoading(false);
          return;
        }

        setIsGeneratingImage(true);
        console.log('🎨 [AIChatModal] Image generation request detected');

        const imageResult = await aiService.generateImage({
          prompt: userMessage,
          context: {
            eraName: context.eraName,
            adventureId: context.adventureId,
          },
        });

        if (imageResult) {
          const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: imageResult.caption || 'Here is the generated image:',
            timestamp: new Date(),
            image: {
              base64: imageResult.imageBase64,
              mimeType: imageResult.mimeType,
            },
          };

          // Show image immediately
          setMessages((prev) => [...prev, aiMsg]);
          analyticsService.trackAIChatImageGenerated({
            era_id: context?.eraId || 'unknown_era',
            prompt_length: userMessage.length,
            session_id: currentSessionId || undefined,
          });

          // Background: Upload image, save URL, and track usage
          if (userId) {
            const messageId = aiMsg.id;
            aiStorageService.uploadImage(userId, imageResult.imageBase64, 'generated').then((imageUrl) => {
              if (imageUrl) {
                // Update message with URL so it persists
                setMessages((prev) => prev.map((m) =>
                  m.id === messageId ? { ...m, imageUrl } : m
                ));
              }
            }).catch(console.error);
            aiStorageService.trackUsage(userId, 'image_generate').catch(console.error);
          }
        } else {
          throw new Error('Failed to generate image');
        }
      }
      // Regular text chat
      else {
        // Check quota before chat
        if (!await checkQuotaBeforeRequest('chat')) {
          setIsLoading(false);
          return;
        }

        const progressSummary = getUserProgressSummary();
        const knowledgeContext = getKnowledgeContextForPrompt();
        const response = await aiService.getChatResponse({
          userMessage,
          conversationHistory: messages,
          context: {
            eraId: context.eraId,
            eraName: context.eraName || 'Islamic History',
            adventureId: context.adventureId,
            currentScreen: context.currentScreen,
          },
          userProgress: progressSummary,
          knowledgeContext,
          enableWebSearch: true, // Enable Google Search grounding
        });

        // Track usage
        if (userId) {
          await aiStorageService.trackUsage(userId, 'chat');
        }

        // Log if sources were found
        if (response.sources && response.sources.length > 0) {
          console.log('🔍 [AIChatModal] Web search sources:', response.sources.length);
        }

        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.text,
          timestamp: new Date(),
          sources: response.sources, // Include web search sources
          suggestedFollowUps: response.suggestedFollowUps,
        };

        setTypewriterMsgId(aiMsg.id);
        setMessages((prev) => [...prev, aiMsg]);
        analyticsService.trackAIChatResponseReceived({
          era_id: context?.eraId || 'unknown_era',
          response_length: response.text.length,
          response_time_ms: responseStartRef.current > 0 ? Date.now() - responseStartRef.current : 0,
          session_id: currentSessionId || undefined,
          has_web_sources: (response.sources?.length || 0) > 0,
          web_sources_count: response.sources?.length || 0,
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('❌ [AIChatModal] Error:', err);
      setError('Sorry, I could not process that. Please try again.');
      analyticsService.trackCustomEvent('ai_chat_error', { era_id: context?.eraId || 'unknown_era' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
      setIsGeneratingImage(false);
      setIsAnalyzingImage(false);
    }
  };

  const handleClose = () => {
    setTypewriterMsgId(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const sessionDurationSeconds = chatOpenedAtRef.current > 0
      ? Math.round((Date.now() - chatOpenedAtRef.current) / 1000)
      : 0;
    analyticsService.trackAIChatClosed({
      era_id: context?.eraId || 'unknown_era',
      messages_count: messages.length,
      session_duration_seconds: sessionDurationSeconds,
      session_id: currentSessionId || undefined,
    });
    onClose();
  };

  // Open image in full screen viewer
  const handleImagePress = (image: { base64: string; mimeType: string }) => {
    Keyboard.dismiss(); // Dismiss keyboard before opening image viewer
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedImage(image);
  };

  // Handle suggestion button press
  const handleSuggestionPress = (suggestion: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleSend(suggestion);
  };

  // Handle tap on AI-generated follow-up suggestion (post-message pills).
  // Identical send behavior as welcome suggestions, but tracked under a
  // distinct event so we can measure engagement vs the static welcome set.
  const handleFollowUpPress = useCallback(
    (suggestion: string, index: number) => {
      analyticsService.trackAIChatSuggestionTapped({
        era_id: context?.eraId || 'unknown_era',
        suggestion_index: index,
        suggestion_length: suggestion.length,
        session_id: currentSessionId || undefined,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      handleSend(suggestion);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [context?.eraId, currentSessionId],
  );

  // Find the latest visible (non-hidden) assistant message — that's the
  // only one that gets follow-up suggestions rendered. Earlier assistant
  // messages keep their `suggestedFollowUps` in state for persistence,
  // but we only render the most recent set so the chat doesn't look
  // cluttered with stacks of stale suggestions on scroll-up.
  const lastAssistantMessageId = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (!m.hidden && m.role === 'assistant') return m.id;
    }
    return null;
  })();

  // Fire `ai_chat_suggestion_shown` exactly once per (latest message ×
  // suggestions reveal). The reveal happens when the typewriter
  // finishes (`typewriterMsgId` flips back to null) on the latest
  // assistant message that has follow-ups attached. Using a ref-based
  // dedupe key (instead of a "shownIds" Set in state) keeps the effect
  // dependency-array minimal and avoids a re-render just to record
  // analytics.
  const lastSuggestionFiredIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (typewriterMsgId !== null) return;
    if (!lastAssistantMessageId) return;
    if (lastSuggestionFiredIdRef.current === lastAssistantMessageId) return;

    const lastMsg = messages.find((m) => m.id === lastAssistantMessageId);
    const followUps = lastMsg?.suggestedFollowUps || [];
    if (followUps.length === 0) return;
    if (lastMsg?.image || lastMsg?.imageUrl) return;

    lastSuggestionFiredIdRef.current = lastAssistantMessageId;
    analyticsService.trackAIChatSuggestionShown({
      era_id: context?.eraId || 'unknown_era',
      suggestions_count: Math.min(followUps.length, 2),
      session_id: currentSessionId || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typewriterMsgId, lastAssistantMessageId, messages]);

  // Suggestion buttons for welcome screen
  const suggestions = [
    'What should I learn next?',
    'Explain this era to me',
    "Quiz me on what I've learned",
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header with back chevron + centered Ibu pill */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleClose} activeOpacity={0.6}>
            <Ionicons name="chevron-back" size={28} color={colors.onyx} />
          </TouchableOpacity>

          {/* Centered pill with avatar */}
          <View style={styles.titleContainer}>
            <View style={styles.titlePill}>
              <View style={styles.titleAvatarWrap}>
                <Image source={AIChatIcon} style={styles.titleAvatar} contentFit="cover" />
              </View>
              <Text style={styles.titleText}>
                <Text style={styles.titleTextBold}>Ibu</Text>
                {' \u2014 your AI learning buddy'}
              </Text>
            </View>
          </View>

          {/* Menu button - only show if there are messages */}
          {messages.length > 0 && (
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowHeaderMenu(true);
              }}
              activeOpacity={0.6}
            >
              <Ionicons name="ellipsis-horizontal" size={24} color={colors.onyx} />
            </TouchableOpacity>
          )}
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            // Gesture-boundary handlers (NOT `onScroll`) drive the
            // auto-follow flag. Per-frame `onScroll` was the source
            // of the jitter: programmatic `scrollToEnd` from each
            // typewriter tick fired onScroll → flag re-set to `true`
            // (since position was at bottom from the scroll itself)
            // → next tick scrolled again → user's drag was constantly
            // overridden. Touching the scroll view now yields control
            // immediately via `onScrollBeginDrag`; release re-checks
            // position via `onScrollEndDrag` + `onMomentumScrollEnd`.
            onScrollBeginDrag={handleScrollBeginDrag}
            onScrollEndDrag={evaluateScrollPosition}
            onMomentumScrollEnd={evaluateScrollPosition}
          >
            {isLoadingHistory ? (
              <View style={styles.loadingHistoryContainer}>
                <ActivityIndicator size="large" color={ArchivesTheme.colors.persianOrange} />
                <Text style={styles.loadingHistoryText}>Loading your chat history...</Text>
              </View>
            ) : messages.length === 0 ? (
              // Welcome intro — port of `collapseChatIntro()` in the
              // mock (`Downloads/03 questions/index.html:2998-3010`):
              //   gsap.to(intro, {
              //     opacity: 0, height: 0, marginBottom: 0,
              //     duration: 0.32, ease: 'power2.inOut',
              //   })
              //
              // Mock animates BOTH `opacity` and `height` to 0 in place
              // — the intro shrinks vertically and fades simultaneously,
              // freeing layout space so message bubbles slide up to
              // fill via natural reflow. NOT a slide-up-off-viewport.
              //
              // `collapseExit` is a custom worklet because Reanimated's
              // built-in `FadeOut` only animates opacity (no height
              // collapse → welcome's slot persists for the full 320ms,
              // messages render below it, then snap up on unmount —
              // exactly the "slide-up xong fade out đi luôn" feedback
              // the user gave). Animating `height` inside the exit
              // makes the slot shrink in real-time, so messages slide
              // up smoothly during the same 320ms.
              <Animated.View
                style={styles.welcomeContainer}
                exiting={collapseExit}
              >
                {/* Lavender speech bubble with typewriter.
                    Entrance: y 14 → 0, opacity, 400ms back.out(1.4)
                    @ 220ms (mock `enterChatScreen` line 3076). The
                    Typewriter inside has its own 300ms startDelay so
                    text begins after the bubble lands. */}
                <AnimatedEntrance
                  preset={{
                    translateY: { from: 14, to: 0 },
                    opacity: { from: 0, to: 1 },
                    duration: 400,
                    easing: easings.backOut14,
                  }}
                  delay={220}
                >
                <View style={styles.speechBubble}>
                  <Typewriter
                    text={`Hi ${userName}, I\u2019m Ibu, your AI learning buddy. I know Islamic history & your progress. Ask me anything!`}
                    variant="body.m"
                    weight="500"
                    color="onyx"
                    align="center"
                    startDelay={300}
                  />
                  {/* Tail — two stacked triangles (outline + fill).
                      Outer uses `acaiPrimary` (#3E2368) so the tail's
                      edge matches the bubble's 1.5px outline; inner
                      uses `acaiTertiary` so the fill blends with the
                      bubble body. Earlier `acaiSecondary` was a
                      lighter halo and didn't match the Figma. */}
                  <View style={styles.speechPointer}>
                    <Svg width={24} height={14} viewBox="0 0 24 14" style={styles.speechPointerSvg}>
                      <Polygon points="0,0 24,0 12,14" fill={colors.acaiPrimary} />
                    </Svg>
                    <Svg width={24} height={12} viewBox="0 0 24 12" style={styles.speechPointerSvg}>
                      <Polygon points="0,0 24,0 12,12" fill={colors.acaiTertiary} />
                    </Svg>
                  </View>
                </View>
                </AnimatedEntrance>

                {/* Character — animated Ibu teacher Rive.
                    Entrance: y 20 → 0, opacity, scale 0.94 → 1, 500ms
                    back.out(~1.5) @ 300ms (mock line 3104:
                    `gsap.to('.chat-ibu', { y: 0, opacity: 1, scale: 1,
                    duration: 0.5, ease: 'back.out(1.6)' }, 0.3)`).
                    rive-react-native v9 needs `stateMachineName` for
                    auto-run; "State Machine 1" is the editor default
                    — mirrors DailyStoryEndScreen + onboarding-step-7. */}
                <AnimatedEntrance
                  preset={{
                    translateY: { from: 20, to: 0 },
                    scale: { from: 0.94, to: 1 },
                    opacity: { from: 0, to: 1 },
                    duration: 500,
                    easing: easings.backOut15,
                  }}
                  delay={300}
                >
                  <View style={styles.characterContainer}>
                    <Rive
                      source={ibuTeacherRive}
                      autoplay
                      stateMachineName="State Machine 1"
                      fit={Fit.Contain}
                      alignment={Alignment.Center}
                      style={styles.characterImage}
                    />
                  </View>
                </AnimatedEntrance>

                {/* Suggestion Buttons.
                    Entrance: y 16 → 0, opacity, 300ms power2.out @ 420ms
                    with 60ms stagger between siblings (mock line 3110:
                    `stagger: { each: 0.06, from: 'start' }`). Each pill
                    is wrapped individually so the per-sibling delay is
                    explicit; using `delay = 420 + i*60` keeps the
                    timing readable inline without StaggerGroup. */}
                <View style={styles.suggestionsContainer}>
                  {suggestions.map((suggestion, index) => (
                    <AnimatedEntrance
                      key={suggestion}
                      preset={{
                        translateY: { from: 16, to: 0 },
                        opacity: { from: 0, to: 1 },
                        duration: 300,
                        easing: easings.power2Out,
                      }}
                      delay={420 + index * 60}
                    >
                      <DepthButton
                        variant="secondary"
                        size="large"
                        surfaceColor="snow"
                        shadowColor="acaiTertiary"
                        borderColor="acaiPrimary"
                        radius={26.5}
                        shadowOffset={6}
                        pressEffect="dip"
                        onPress={() => handleSuggestionPress(suggestion)}
                      >
                        <Typography variant="label.xs" weight="600" color="onyx">
                          {suggestion}
                        </Typography>
                      </DepthButton>
                    </AnimatedEntrance>
                  ))}
                </View>
              </Animated.View>
            ) : (
              // Each visible message wraps in Animated.View with the
              // `messageEnter` worklet — direct port of the mock's
              // `appendChatMessage` (`Downloads/03 questions/index.html:
              // 2948-2967`):
              //   gsap.fromTo(el,
              //     { opacity: 0, y: 14 },
              //     { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
              //
              // Critically, NO `delay` here. Earlier the first message
              // had `delay: 320ms` so it appeared AFTER welcome's
              // exit — but the mock fires user-message entrance and
              // intro collapse on the SAME frame. Both run in
              // parallel: intro shrinks (height + opacity → 0,
              // 320ms), message slides up (y:14 → 0, opacity 0 → 1,
              // 300ms). The user sees the message rising into the
              // space the intro is vacating, not appearing after a
              // dead pause.
              messages.filter((m) => !m.hidden).map((message) => (
                <Animated.View
                  key={message.id}
                  entering={messageEnter}
                >
                  {/* Quiz context shown as a regular user message bubble */}
                  {message.quizContext && (
                    <View style={styles.messageBubble}>
                      <View style={[styles.userBubble, { width: '100%' }]}>
                        <View style={styles.userContent}>
                          <Text style={styles.userText}>
                            Quiz Review: {message.quizContext.title}
                            {'\n'}
                            {message.quizContext.eraName} {'\u00B7'} {message.quizContext.score}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                <View
                  style={[styles.messageBubble, message.role === 'user' ? styles.userBubble : styles.assistantBubble]}
                >
                  {message.role === 'user' ? (
                    <View style={styles.userContent}>
                      {/* Show uploaded image above text for user messages */}
                      {(message.image || message.imageUrl) && message.isUploadedImage && (
                        <TouchableOpacity
                          onPress={() => message.image && handleImagePress(message.image)}
                          activeOpacity={0.9}
                          style={styles.uploadedImageContainer}
                        >
                          <Image
                            source={{ uri: message.image ? `data:${message.image.mimeType};base64,${message.image.base64}` : message.imageUrl }}
                            style={styles.uploadedImage}
                            contentFit="cover"
                          />
                        </TouchableOpacity>
                      )}
                      <Text style={styles.userText}>{message.content}</Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.assistantContent}>
                        {typewriterMsgId === message.id ? (
                          // Progressive markdown — see StreamingAssistantMessage
                          // above for why this is NOT the legacy Typewriter
                          // component. Same `useTypewriter` cadence underneath,
                          // but rendered through `renderMarkdownText` so the
                          // bubble's typography stays byte-identical between
                          // streaming and final state (no font/size snap).
                          <StreamingAssistantMessage
                            text={message.content}
                            textStyle={styles.assistantText}
                            onComplete={() => {
                              setTypewriterMsgId(null);
                              // Pills mount on the next render (when
                              // `typewriterMsgId === null` flips the
                              // visibility check inside FollowUpSuggestions).
                              // `handleStreamTick` was the only scroll
                              // signal during streaming — once typewriter
                              // ends, nothing else pulls the pills into
                              // view, so they can land below the fold if
                              // the message bubble already sat at the
                              // bottom edge. We fire ONE animated scroll
                              // ~80ms later: long enough for React to
                              // commit the new layout (pills + entrance
                              // transform offset of y:12) and for native
                              // to recompute contentSize, short enough
                              // that it overlaps with the pills' 280ms
                              // entrance animation — user sees a unified
                              // motion (pills slide up + viewport pulls
                              // down) rather than a snap.
                              //
                              // Respects `userIsAtBottomRef` so we don't
                              // yank a user who scrolled up to read.
                              // Skips when no pills will render (image
                              // response, empty suggestions) to avoid an
                              // unnecessary scroll.
                              const hasPills =
                                !message.image &&
                                !message.imageUrl &&
                                (message.suggestedFollowUps?.length || 0) > 0;
                              if (hasPills && userIsAtBottomRef.current) {
                                setTimeout(() => {
                                  scrollViewRef.current?.scrollToEnd({ animated: true });
                                }, 80);
                              }
                            }}
                            onTick={handleStreamTick}
                          />
                        ) : (
                          renderMarkdownText(message.content, styles.assistantText)
                        )}
                      </View>
                      {/* Render generated image if present - full width, tappable for full view */}
                      {(message.image || message.imageUrl) && (
                        <TouchableOpacity
                          onPress={() => message.image && handleImagePress(message.image)}
                          activeOpacity={0.9}
                          style={styles.generatedImageContainer}
                        >
                          <Image
                            source={{ uri: message.image ? `data:${message.image.mimeType};base64,${message.image.base64}` : message.imageUrl }}
                            style={styles.generatedImage}
                            contentFit="cover"
                          />
                          <View style={styles.tapToViewHint}>
                            <Ionicons name="expand-outline" size={14} color="white" />
                            <Text style={styles.tapToViewText}>Tap to expand</Text>
                          </View>
                        </TouchableOpacity>
                      )}
                      {/* Follow-up suggestions: only on the latest assistant
                          message, only when typewriter is done, never on image
                          responses (visual context, not Q&A), and hidden while
                          the user is composing their own input or another
                          request is in flight. Each AI message keeps its own
                          `suggestedFollowUps` in state for persistence so
                          that on app restart the latest message can re-render
                          its pills (visibility check still applies). */}
                      {!message.image && !message.imageUrl && (
                        <FollowUpSuggestions
                          suggestions={message.suggestedFollowUps || []}
                          visible={
                            message.id === lastAssistantMessageId &&
                            typewriterMsgId === null &&
                            !isLoading &&
                            !pendingImage &&
                            inputText.trim().length === 0
                          }
                          onPress={handleFollowUpPress}
                        />
                      )}
                      {/* Render web search sources if present */}
                      {message.sources && message.sources.length > 0 && (
                        <View style={styles.sourcesContainer}>
                          <View style={styles.sourcesHeader}>
                            <Ionicons name="search-outline" size={12} color="#9A8B7A" />
                            <Text style={styles.sourcesTitle}>Sources</Text>
                          </View>
                          {message.sources.slice(0, 3).map((source, index) => (
                            <TouchableOpacity
                              key={index}
                              style={styles.sourceItem}
                              onPress={() => Linking.openURL(source.uri)}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="link-outline" size={12} color={ArchivesTheme.colors.mossGreen} />
                              <Text style={styles.sourceText} numberOfLines={1}>
                                {source.title}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </>
                  )}
                </View>
                </Animated.View>
              ))
            )}

            {/* Thinking / Analyzing / Generating loader — animated to
                match the message bubbles around it. Without `entering`
                the indicator snapped in when `isLoading` flipped true;
                without `exiting` it snapped out the moment the AI
                message landed, jarring against the AI message's
                300ms slide-up. Reusing the same `messageEnter`
                worklet keeps the loader visually consistent with
                user/AI bubbles (same y:14 → 0 + opacity); the shorter
                `messageExit` (180ms opacity-only) lets it dissolve
                without competing against the incoming AI bubble's
                translateY animation that would land in the same row. */}
            {isLoading && (
              <Animated.View
                style={[styles.messageBubble, styles.assistantBubble]}
                entering={messageEnter}
                exiting={messageExit}
              >
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={ArchivesTheme.colors.persianOrange} />
                  <Text style={styles.loadingText}>
                    {isAnalyzingImage ? 'Analyzing image...' : isGeneratingImage ? 'Generating image...' : 'Thinking...'}
                  </Text>
                </View>
              </Animated.View>
            )}

            {error && (
              <Animated.View
                style={styles.errorContainer}
                entering={messageEnter}
                exiting={messageExit}
              >
                <Ionicons name="alert-circle" size={20} color="#E74C3C" />
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            )}
          </ScrollView>

          {/* Pending Image Preview */}
          {pendingImage && (
            <View style={styles.pendingImageContainer}>
              <Image
                source={{ uri: pendingImage.uri }}
                style={styles.pendingImagePreview}
                contentFit="cover"
              />
              <TouchableOpacity
                style={styles.pendingImageRemove}
                onPress={handleClearPendingImage}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.pendingImageHint}>Add a message or tap send</Text>
            </View>
          )}

          {/* Input Bar */}
          <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.inputRow}>
              {/* Plus button - opens action menu */}
              <TouchableOpacity
                style={styles.plusButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowActionMenu(true);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={24} color={colors.onyx} />
              </TouchableOpacity>

              {/* Text Input with Send Button inside */}
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder={pendingImage ? 'Ask about this image...' : 'What are you curious about?'}
                  placeholderTextColor="#9A8B7A"
                  multiline
                  maxLength={500}
                  onSubmitEditing={() => handleSend()}
                  returnKeyType="send"
                  blurOnSubmit={false}
                />
                {/* Send button inside input - enabled if text OR pending image */}
                <TouchableOpacity
                  style={[styles.sendButton, (!inputText.trim() && !pendingImage || isLoading) && styles.sendButtonDisabled]}
                  onPress={() => handleSend()}
                  disabled={(!inputText.trim() && !pendingImage) || isLoading}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-up" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
            {/* AI Disclaimer */}
            <Text style={styles.aiDisclaimer}>Beta feature – AI responses may be inaccurate</Text>
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* Full-screen Image Viewer Modal */}
      <Modal
        visible={selectedImage !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.imageViewerContainer}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.imageViewerCloseButton}
            onPress={() => setSelectedImage(null)}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={40} color="white" />
          </TouchableOpacity>

          {/* Full-screen image */}
          {selectedImage && (
            <Image
              source={{ uri: `data:${selectedImage.mimeType};base64,${selectedImage.base64}` }}
              style={styles.fullScreenImage}
              contentFit="contain"
            />
          )}

          {/* Share button */}
          <TouchableOpacity
            style={styles.saveToPhotosButton}
            onPress={handleShareImage}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="share-outline" size={24} color="white" />
                <Text style={styles.saveToPhotosText}>Share</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Action Menu Modal */}
      <Modal
        visible={showActionMenu}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowActionMenu(false)}
      >
        <TouchableOpacity
          style={styles.actionMenuOverlay}
          activeOpacity={1}
          onPress={() => setShowActionMenu(false)}
        >
          <View style={[styles.actionMenuContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.actionMenuHandle} />

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={handlePickImage}
              activeOpacity={0.7}
            >
              <View style={styles.actionMenuIconContainer}>
                <Ionicons name="images-outline" size={24} color={ArchivesTheme.colors.persianOrange} />
              </View>
              <View style={styles.actionMenuTextContainer}>
                <Text style={styles.actionMenuTitle}>Upload Image</Text>
                <Text style={styles.actionMenuSubtitle}>Choose from your photo library</Text>
              </View>
            </TouchableOpacity>

            {/* Quick Prompts Divider */}
            <View style={styles.actionMenuDivider} />

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => handleQuickPrompt('Test me with harder questions')}
              activeOpacity={0.7}
            >
              <View style={styles.actionMenuIconContainer}>
                <Ionicons name="school-outline" size={24} color={ArchivesTheme.colors.mossGreen} />
              </View>
              <View style={styles.actionMenuTextContainer}>
                <Text style={styles.actionMenuTitle}>Test me with harder questions</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => handleQuickPrompt('Give me more details on the last topic')}
              activeOpacity={0.7}
            >
              <View style={styles.actionMenuIconContainer}>
                <Ionicons name="information-circle-outline" size={24} color={ArchivesTheme.colors.mossGreen} />
              </View>
              <View style={styles.actionMenuTextContainer}>
                <Text style={styles.actionMenuTitle}>Give me more details on the last topic</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => handleQuickPrompt('Where can I learn more on the last topic')}
              activeOpacity={0.7}
            >
              <View style={styles.actionMenuIconContainer}>
                <Ionicons name="book-outline" size={24} color={ArchivesTheme.colors.mossGreen} />
              </View>
              <View style={styles.actionMenuTextContainer}>
                <Text style={styles.actionMenuTitle}>Where can I learn more on the last topic</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionMenuCancel}
              onPress={() => setShowActionMenu(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.actionMenuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Header Menu Modal */}
      <Modal
        visible={showHeaderMenu}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowHeaderMenu(false)}
      >
        <TouchableOpacity
          style={styles.headerMenuOverlay}
          activeOpacity={1}
          onPress={() => setShowHeaderMenu(false)}
        >
          <View style={[styles.headerMenuContainer, { marginTop: insets.top + 50 }]}>
            <TouchableOpacity
              style={styles.headerMenuItem}
              onPress={handleClearHistory}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color="#E74C3C" />
              <Text style={styles.headerMenuItemText}>Clear Chat History</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.snow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    marginRight: 32, // Balance the back button width
  },
  titlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bluePrimary,
    borderRadius: 55,
    height: 33,
    paddingLeft: 6,
    paddingRight: 18,
    gap: 9,
  },
  titleAvatarWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    overflow: 'hidden',
    backgroundColor: colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleAvatar: {
    width: 26,
    height: 26,
  },
  titleText: {
    fontFamily: 'Onest',
    fontSize: 14,
    color: 'white',
    letterSpacing: -0.14,
  },
  titleTextBold: {
    fontFamily: 'Onest',
    fontWeight: '700',
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },

  // Welcome Screen Styles
  welcomeContainer: {
    flex: 1,
    paddingTop: 8,
    alignItems: 'center',
  },
  speechBubble: {
    backgroundColor: colors.acaiTertiary,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.acaiSecondary,
    paddingHorizontal: 22,
    paddingVertical: 16,
    marginBottom: 8,
    width: 311,
    position: 'relative',
    zIndex: 1,
  },
  speechPointer: {
    position: 'absolute',
    bottom: -14,
    left: 45,
    width: 24,
    height: 14,
  },
  speechPointerSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  characterContainer: {
    alignItems: 'center',
    marginTop: 15,
  },
  characterImage: {
    width: SCREEN_WIDTH * 0.7,
    height: 1,
  },

  // Suggestion Buttons
  suggestionsContainer: {
    width: '100%',
    gap: 8,
    paddingHorizontal: 20,

  },
  // Inline follow-up suggestions rendered below the latest assistant
  // message bubble. Right-aligned to mirror user-action affordances
  // (user messages sit on the right; tappable pills are also actions
  // the user takes, so they share that side). `width: '100%'` is
  // required for `justifyContent: 'flex-end'` to work as right-align —
  // without an explicit full width the container would shrink to its
  // content and `justifyContent` would have no extra space to pack.
  // `flexWrap` keeps long suggestion text wrapping cleanly to a
  // second row on narrow Android devices instead of clipping.
  followUpContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
    marginBottom: 4,
    width: '100%',
  },
  // Message Bubbles
  messageBubble: {
    marginBottom: 16,
  },
  userBubble: {
    alignItems: 'flex-end',
  },
  assistantBubble: {
    alignItems: 'flex-start',
  },
  userContent: {
    maxWidth: '82%',
    backgroundColor: colors.acaiTertiary,
    borderRadius: 19.5,
    borderBottomRightRadius: 2,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  assistantContent: {
    maxWidth: '100%',
    paddingVertical: 2,
    paddingLeft: 2,
  },
  userText: {
    fontFamily: 'Onest',
    fontWeight: '500',
    fontSize: 15,
    lineHeight: 21,
    color: colors.onyx,
    letterSpacing: -0.14,
  },
  assistantText: {
    fontFamily: 'Onest',
    fontWeight: '500',
    fontSize: 15,
    lineHeight: 21,
    color: colors.onyx,
    letterSpacing: -0.14,
  },

  // Web Search Sources
  sourcesContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0D5C5',
    maxWidth: '85%',
  },
  sourcesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sourcesTitle: {
    fontFamily: 'DM Sans',
    fontSize: 11,
    fontWeight: '600',
    color: '#9A8B7A',
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  sourceText: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    color: ArchivesTheme.colors.mossGreen,
    marginLeft: 6,
    flex: 1,
  },

  generatedImageContainer: {
    width: '100%',
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  generatedImage: {
    width: '100%',
    height: 220,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  tapToViewHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  tapToViewText: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: 'white',
    marginLeft: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Onest',
    fontSize: 15,
    color: colors.onyx,
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  errorText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: '#E74C3C',
    marginLeft: 8,
    flex: 1,
  },

  // Input Bar
  inputContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
    // paddingBottom is set dynamically using insets.bottom
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiDisclaimer: {
    fontFamily: 'DM Sans',
    fontSize: 11,
    color: '#9A8B7A',
    textAlign: 'center',
    marginTop: 8,
  },
  plusButton: {
    width: 47,
    height: 47,
    borderRadius: 23.5,
    backgroundColor: colors.snow,
    borderWidth: 1,
    borderColor: colors.onyx,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.snow,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: colors.onyx,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 47,
  },
  input: {
    flex: 1,
    fontFamily: 'Onest',
    fontSize: 14,
    color: colors.onyx,
    maxHeight: 100,
    paddingTop: 0,
    paddingBottom: 0,
    marginRight: 8,
    letterSpacing: -0.14,
  },
  sendButton: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: colors.acaiSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#C5C5C5',
  },

  // Full-screen image viewer styles
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 30,
    right: 20,
    zIndex: 10,
  },
  fullScreenImage: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_HEIGHT * 0.7,
  },
  saveToPhotosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ArchivesTheme.colors.persianOrange,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
  },
  saveToPhotosText: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },

  // Uploaded image in user messages
  uploadedImageContainer: {
    width: '100%',
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  uploadedImage: {
    width: '100%',
    height: 150,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },

  // Pending image preview above input
  pendingImageContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'white',
    position: 'relative',
  },
  pendingImagePreview: {
    width: '100%',
    height: 120,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  pendingImageRemove: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  pendingImageHint: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: '#9A8B7A',
    textAlign: 'center',
    paddingVertical: 8,
  },

  // Action menu styles
  actionMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  actionMenuContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  actionMenuHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0D5C5',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  actionMenuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ArchivesTheme.colors.creamWhite,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionMenuTextContainer: {
    flex: 1,
  },
  actionMenuTitle: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
    marginBottom: 2,
  },
  actionMenuSubtitle: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    color: '#9A8B7A',
  },
  actionMenuDivider: {
    height: 1,
    backgroundColor: '#E0D5C5',
    marginVertical: 8,
  },
  actionMenuCancel: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  actionMenuCancelText: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '600',
    color: '#9A8B7A',
  },

  // Menu button in header
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },

  // Loading history state
  loadingHistoryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingHistoryText: {
    fontFamily: 'DM Sans',
    fontSize: 15,
    color: ArchivesTheme.colors.mutedNavy,
    marginTop: 16,
  },

  // Header menu styles
  headerMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  headerMenuContainer: {
    position: 'absolute',
    right: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 4,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  headerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  headerMenuItemText: {
    fontFamily: 'DM Sans',
    fontSize: 15,
    fontWeight: '500',
    color: '#E74C3C',
    marginLeft: 10,
  },

  // Quiz context banner (Chat to Learn)
});
