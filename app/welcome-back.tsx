import React from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Pressable,
  Text,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Redirect } from 'expo-router';
import * as Haptics from 'expo-haptics';

import {
  Typography,
  DepthButton,
  colors,
  spacing,
  easings,
} from '@/components/ui';
import { AnimatedEntrance } from '@/components/ui/animations';
import { Mascot } from '@/components/onboarding/Mascot/Mascot';
import { AccountAvatar } from '@/components/onboarding/auth/AccountAvatar';
import {
  getActiveAccount,
  removeRememberedAccount,
  type RememberedAccount,
} from '@/services/RememberedAccountService';
import { useRememberedOAuth } from '@/hooks/useRememberedOAuth';
import { useOnboardingStore } from '@/stores/onboardingStore';
import LoadingScreen from '@/components/LoadingScreen';
import AppLogger from '@/services/AppLogger';

/**
 * Welcome Back — returning-user entry screen.
 *
 * Figma: 3812:5396. Layout is a vertical linear stack (NOT anchored to
 * bottom) with exact gaps lifted from Figma's absolute positions:
 *   mascot → title         36px
 *   title  → subtitle      10px
 *   subtitle → card        40px
 *   card → button          32px
 *   button → sign-out      20px
 * Any remaining vertical space sits below "Sign out" as intentional
 * whitespace, matching the design.
 *
 * Routing decisions live in app/index.tsx. This screen assumes:
 *   - a RememberedAccount exists in local storage
 *   - Clerk reports the user as signed-out
 *
 * "Continue as X" dispatches by `lastAuthMethod`:
 *   - oauth_apple / oauth_google → Clerk OAuth flow (useRememberedOAuth)
 *   - email → push onboarding-auth with ?mode=signin&email=... prefill
 *
 * "Not you? Sign out" fully purges the local cache (remembered + onboarding
 * answers) and drops back into the new-user onboarding flow.
 */
export default function WelcomeBackScreen() {
  const [account, setAccount] = React.useState<RememberedAccount | null>(null);
  const [isLoadingAccount, setIsLoadingAccount] = React.useState(true);
  const [oauthError, setOauthError] = React.useState<string | null>(null);
  const resetOnboarding = useOnboardingStore((s) => s.reset);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await getActiveAccount();
        if (!cancelled) {
          setAccount(next);
          setIsLoadingAccount(false);
        }
      } catch (err) {
        AppLogger.error('auth', 'Welcome-back: read active account failed', undefined, err);
        if (!cancelled) {
          setIsLoadingAccount(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleOAuthSuccess = React.useCallback(() => {
    AppLogger.info('auth', 'Welcome-back OAuth success → /(tabs)/today');
    router.replace('/(tabs)/today' as never);
  }, []);

  const handleOAuthError = React.useCallback((err: { message: string }) => {
    AppLogger.warn('auth', 'Welcome-back OAuth error', { message: err.message });
    setOauthError(err.message);
  }, []);

  // Both hooks always mounted so hook order stays stable across account
  // changes. startOAuthFlow is lazy — the unused one is effectively idle.
  const apple = useRememberedOAuth({
    strategy: 'oauth_apple',
    onSuccess: handleOAuthSuccess,
    onError: handleOAuthError,
  });
  const google = useRememberedOAuth({
    strategy: 'oauth_google',
    onSuccess: handleOAuthSuccess,
    onError: handleOAuthError,
  });

  const isLoadingOAuth = apple.isLoading || google.isLoading;

  const handleContinue = React.useCallback(async () => {
    if (!account) return;
    setOauthError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    AppLogger.info('auth', 'Welcome-back continue tapped', {
      method: account.lastAuthMethod,
    });
    switch (account.lastAuthMethod) {
      case 'oauth_apple':
        await apple.start();
        break;
      case 'oauth_google':
        await google.start();
        break;
      case 'email':
        router.push(
          `/onboarding-auth?mode=signin&email=${encodeURIComponent(account.email)}` as never,
        );
        break;
    }
  }, [account, apple, google]);

  const handleSignOut = React.useCallback(async () => {
    if (!account) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    AppLogger.info('auth', 'Welcome-back sign out tapped', {
      method: account.lastAuthMethod,
      userId: account.userId,
    });
    try {
      await removeRememberedAccount(account.userId);
    } catch (err) {
      AppLogger.error('auth', 'Welcome-back: remove remembered failed', undefined, err);
    }
    resetOnboarding();
    router.replace('/onboarding-step-1' as never);
  }, [account, resetOnboarding]);

  if (isLoadingAccount) {
    return <LoadingScreen />;
  }

  if (!account) {
    AppLogger.warn('auth', 'Welcome-back rendered with no account; redirecting');
    return <Redirect href="/onboarding-step-1" />;
  }

  const displayName = account.firstName?.trim() || 'Explorer';
  const ctaLabel = `CONTINUE AS ${displayName.toUpperCase()}`;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.stack}>
          {/* Mascot — linear top, no bottom anchor. */}
          <AnimatedEntrance
            preset={{
              scale: { from: 0.8, to: 1 },
              opacity: { from: 0, to: 1 },
              duration: 500,
              easing: easings.backOut15,
            }}
            style={styles.mascotWrapper}
          >
            <Mascot width={210} height={180} autoPlayEntrance={false} enableIdleLoops={false} />
          </AnimatedEntrance>

          {/* Title */}
          <AnimatedEntrance
            preset={{
              translateY: { from: 20, to: 0 },
              opacity: { from: 0, to: 1 },
              duration: 500,
              easing: easings.backOut15,
            }}
            delay={150}
            style={styles.titleWrapper}
          >
            <Typography
              family="bounded"
              size={30}
              lineHeight={38}
              color="onyx"
              align="center"
              uppercase
            >
              Welcome back
            </Typography>
          </AnimatedEntrance>

          {/* Subtitle */}
          <AnimatedEntrance
            preset="fadeIn"
            delay={300}
            style={styles.subtitleWrapper}
          >
            <Typography
              size={16}
              weight="500"
              extraColor={colors.textMuted}
              align="center"
              lineHeight={22}
            >
              Pick up right where you left off
            </Typography>
          </AnimatedEntrance>

          {/* Account card */}
          <AnimatedEntrance
            preset={{
              translateY: { from: 30, to: 0 },
              opacity: { from: 0, to: 1 },
              duration: 500,
              easing: easings.backOut15,
            }}
            delay={450}
            style={styles.cardWrapper}
          >
            <View style={styles.card}>
              <AccountAvatar
                imageUrl={account.avatarUrl}
                firstName={account.firstName}
                email={account.email}
                size={48}
              />
              <View style={styles.cardText}>
                <Typography size={17} weight="600" color="onyx">
                  {displayName}
                </Typography>
                <Typography
                  size={14}
                  weight="500"
                  extraColor={colors.textMuted}
                >
                  {account.email}
                </Typography>
              </View>
            </View>
          </AnimatedEntrance>

          {/* CTA */}
          <AnimatedEntrance
            preset={{
              translateY: { from: 40, to: 0 },
              opacity: { from: 0, to: 1 },
              duration: 500,
              easing: easings.backOut2,
            }}
            delay={600}
            style={styles.ctaWrapper}
          >
            <DepthButton
              surfaceColor="onyx"
              shadowColor="white"
              borderColor="onyx"
              onPress={handleContinue}
              isDisabled={isLoadingOAuth}
            >
              {isLoadingOAuth ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Typography variant="label.m" color="white">
                  {ctaLabel}
                </Typography>
              )}
            </DepthButton>
          </AnimatedEntrance>

          {/* Sign out link */}
          <AnimatedEntrance preset="fadeIn" delay={750} style={styles.signOutRow}>
            <Pressable onPress={handleSignOut} hitSlop={12} disabled={isLoadingOAuth}>
              <Text style={styles.signOutPrompt} allowFontScaling={false}>
                Not you?{'  '}
                <Text style={styles.signOutLink}>Sign out</Text>
              </Text>
            </Pressable>
          </AnimatedEntrance>

          {oauthError ? (
            <Typography
              size={13}
              weight="500"
              extraColor={colors.incorrectSecondary}
              align="center"
              style={styles.errorText}
            >
              {oauthError}
            </Typography>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

// Gaps derive directly from Figma (absolute positions converted to linear
// marginTop values). See top-of-file comment for the table.
const GAP_MASCOT_TITLE = 36;
const GAP_TITLE_SUBTITLE = 10;
const GAP_SUBTITLE_CARD = 40;
const GAP_CARD_BUTTON = 32;
const GAP_BUTTON_SIGNOUT = 20;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.snow },
  safe: { flex: 1 },
  stack: {
    flex: 1,
    paddingHorizontal: spacing.lg, // 24px — matches Figma left/right = 24
  },

  mascotWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 110, // 40px below SafeAreaView top = ~99px from viewport top
  },
  titleWrapper: {
    marginTop: GAP_MASCOT_TITLE,
  },
  subtitleWrapper: {
    marginTop: GAP_TITLE_SUBTITLE,
  },
  cardWrapper: {
    marginTop: GAP_SUBTITLE_CARD,
  },
  card: {
    width: '100%',
    height: 80,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md, // 16px — matches Figma avatar left offset
    gap: spacing.md,
    overflow: 'hidden',
  },
  cardText: {
    flex: 1,
    gap: 4,
  },

  ctaWrapper: {
    marginTop: GAP_CARD_BUTTON,
  },
  signOutRow: {
    alignItems: 'center',
    marginTop: GAP_BUTTON_SIGNOUT,
  },
  signOutPrompt: {
    fontFamily: 'Onest-Medium',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
  },
  signOutLink: {
    fontFamily: 'Onest-SemiBold',
    color: colors.onyx,
    textDecorationLine: 'underline',
  },

  errorText: {
    marginTop: spacing.md,
  },
});
