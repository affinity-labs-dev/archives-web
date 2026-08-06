import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Typography,
  DepthButton,
  AuthButton,
  OptionList,
  Typewriter,
  SpeechBubble,
  ProgressBar,
  StatsBadge,
  ReviewCard,
  typographyVariants,
  colors,
  spacing,
  radius,
} from '@/components/ui';
import type { TypographyVariant } from '@/components/ui';
import {
  AnimatedEntrance,
  StaggerGroup,
  ENTRANCE_PRESETS,
  type EntrancePresetKey,
} from '@/components/ui/animations';
import { Mascot } from '@/components/onboarding/Mascot';
import { WelcomeStackedText } from '@/components/onboarding/WelcomeStackedText';

/**
 * UI Playground — tests every new design-system primitive on device.
 * Route it from somewhere in the app or navigate directly to `/ui-playground`.
 */
export default function UIPlaygroundScreen() {
  const [interests, setInterests] = useState<string[]>([]);
  const [goal, setGoal] = useState<string | null>(null);
  const [progress, setProgress] = useState(24);
  const [replayKey, setReplayKey] = useState(0);

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Section: Typography variants */}
        <Section title="Typography · all variants">
          {(Object.keys(typographyVariants) as TypographyVariant[]).map((variant) => (
            <View key={variant} style={styles.variantRow}>
              <Typography size="xs" color="textMuted" style={{ marginBottom: 4 }}>
                {variant}
              </Typography>
              <Typography variant={variant}>
                {variant.startsWith('display') ? 'WELCOME, AHMED!' : 'The quick brown fox'}
              </Typography>
            </View>
          ))}
        </Section>

        {/* Section: DepthButton variants */}
        <Section title="DepthButton · variants">
          <DepthButton variant="primary" onPress={() => {}}>
            <Typography variant="label.m" color="white">CONTINUE</Typography>
          </DepthButton>
          <View style={{ height: 12 }} />
          <DepthButton variant="secondary" onPress={() => {}}>
            <Typography variant="label.m" color="white">START MY DAY</Typography>
          </DepthButton>
          <View style={{ height: 12 }} />
          <DepthButton variant="tertiary" onPress={() => {}}>
            <Typography variant="label.m" color="white">LET&apos;S START</Typography>
          </DepthButton>
          <View style={{ height: 12 }} />
          <DepthButton variant="tertiary-alt" onPress={() => {}}>
            <Typography variant="label.m" color="onyx">LET&apos;S START</Typography>
          </DepthButton>
        </Section>

        {/* Section: DepthButton sizes */}
        <Section title="DepthButton · sizes">
          <DepthButton variant="primary" size="large" onPress={() => {}}>
            <Typography variant="label.m" color="white">LARGE</Typography>
          </DepthButton>
          <View style={{ height: 12 }} />
          <DepthButton variant="primary" size="medium" onPress={() => {}}>
            <Typography variant="label.s" color="white">MEDIUM</Typography>
          </DepthButton>
          <View style={{ height: 12 }} />
          <DepthButton variant="primary" size="small" isFullWidth={false} onPress={() => {}}>
            <Typography variant="label.s" color="white">SMALL</Typography>
          </DepthButton>
        </Section>

        {/* Section: DepthButton overrides */}
        <Section title="DepthButton · overrides">
          <DepthButton
            variant="primary"
            surfaceColor="aspenGold"
            shadowColor="acaiPrimary"
            borderColor="acaiPrimary"
            onPress={() => {}}
          >
            <Typography variant="label.m" color="onyx">CUSTOM MIX</Typography>
          </DepthButton>
          <View style={{ height: 12 }} />
          <DepthButton variant="primary" isDisabled onPress={() => {}}>
            <Typography variant="label.m" color="white">DISABLED</Typography>
          </DepthButton>
        </Section>

        {/* Section: Auth buttons */}
        <Section title="AuthButton · OAuth providers">
          <AuthButton provider="apple" onPress={() => {}} />
          <View style={{ height: 12 }} />
          <AuthButton provider="google" onPress={() => {}} />
          <View style={{ height: 12 }} />
          <AuthButton provider="email" onPress={() => {}} />
        </Section>

        {/* Section: OptionList multi-select */}
        <Section title="OptionList · multi-select (interests)">
          <OptionList
            selectionMode="multi"
            value={interests}
            onChange={(v) => setInterests(v as string[])}
            options={[
              { id: 'fun', label: 'Just for fun' },
              { id: 'heritage', label: 'Connect with heritage' },
              { id: 'children', label: 'Teach my children' },
              { id: 'productive', label: 'Spend time productively' },
              { id: 'other', label: 'Other' },
            ]}
          />
        </Section>

        {/* Section: OptionList single-select */}
        <Section title="OptionList · single-select (daily goal)">
          <OptionList
            selectionMode="single"
            value={goal}
            onChange={(v) => setGoal(v as string | null)}
            options={[
              { id: '5', label: '5 min / day · Casual' },
              { id: '10', label: '10 min / day · Regular' },
              { id: '15', label: '15 min / day · Serious' },
              { id: '20', label: '20 min / day · Intense' },
            ]}
          />
        </Section>

        {/* Section: Typewriter */}
        <Section title="Typewriter">
          <DepthButton
            variant="outline"
            size="small"
            isFullWidth={false}
            onPress={() => setReplayKey((k) => k + 1)}
          >
            <Typography variant="label.s" color="onyx">Replay</Typography>
          </DepthButton>
          <View style={{ height: 16 }} />
          <Typewriter
            key={replayKey}
            text="Hi! I'm Ibu — your guide through Islamic History."
            variant="body.l"
            color="onyx"
          />
        </Section>

        {/* Section: SpeechBubble */}
        <Section title="SpeechBubble">
          <SpeechBubble>
            <Typography variant="body.m">What&apos;s your daily learning goal?</Typography>
          </SpeechBubble>
        </Section>

        {/* Section: ProgressBar */}
        <Section title="ProgressBar">
          <ProgressBar percent={progress} />
          <View style={{ height: 12 }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[15, 24, 50, 74].map((p) => (
              <DepthButton
                key={p}
                variant="outline"
                size="small"
                isFullWidth={false}
                onPress={() => setProgress(p)}
              >
                <Typography variant="label.s" color="onyx">{`${p}%`}</Typography>
              </DepthButton>
            ))}
          </View>
        </Section>

        {/* Section: StatsBadge */}
        <Section title="StatsBadge · interlocking pills">
          <StatsBadge leftLabel="3  Eras" rightLabel="Less than 5 mins a day" />
        </Section>

        {/* Section: ReviewCard */}
        <Section title="ReviewCard">
          <ReviewCard
            name="Hana"
            review="My 6 year old daughter insists to sit with me on Archives, we love questioning each other even long after finishing each day's lesson"
          />
        </Section>

        {/* Section: Mascot */}
        <Section title="Mascot · entrance + idle loops">
          <View style={{ height: 160, alignItems: 'flex-start' }}>
            <Mascot size={140} />
          </View>
        </Section>

        {/* Section: Animation presets */}
        <AnimationPresetsSection />

        {/* Section: Question screen simulation */}
        <QuestionSceneSection />

        {/* Section: Welcome screen simulation */}
        <WelcomeSceneSection />

        <View style={{ height: 64 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// Animation presets showcase — each preset has its own replay button
// ─────────────────────────────────────────────

function AnimationPresetsSection() {
  return (
    <View style={styles.section}>
      <Typography variant="heading.m" color="onyx" style={styles.sectionTitle}>
        Animation presets · replay each
      </Typography>
      {(Object.keys(ENTRANCE_PRESETS) as EntrancePresetKey[]).map((preset) => (
        <PresetDemoRow key={preset} preset={preset} />
      ))}
    </View>
  );
}

function PresetDemoRow({ preset }: { preset: EntrancePresetKey }) {
  const [key, setKey] = useState(0);

  return (
    <View style={styles.presetRow}>
      <View style={styles.presetMeta}>
        <Typography variant="label.s" color="onyx">
          {preset}
        </Typography>
        <DepthButton
          variant="outline"
          size="small"
          isFullWidth={false}
          onPress={() => setKey((k) => k + 1)}
        >
          <Typography variant="label.xs" color="onyx">
            Replay
          </Typography>
        </DepthButton>
      </View>
      <View style={styles.presetStage}>
        <AnimatedEntrance preset={preset} replayKey={key}>
          <View style={styles.presetBox}>
            <Typography variant="label.s" color="white">
              {preset}
            </Typography>
          </View>
        </AnimatedEntrance>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Question screen simulation — mascot → bubble → typewriter → options → CTA
// ─────────────────────────────────────────────

function QuestionSceneSection() {
  const [key, setKey] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  const replay = () => {
    setShowOptions(false);
    setSelectedGoal(null);
    setKey((k) => k + 1);
  };

  return (
    <View style={styles.section}>
      <View style={styles.sceneHeader}>
        <Typography variant="heading.m" color="onyx" style={styles.sceneHeaderTitle}>
          Question scene · full choreography
        </Typography>
        <DepthButton
          variant="outline"
          size="small"
          isFullWidth={false}
          onPress={replay}
        >
          <Typography variant="label.xs" color="onyx">
            Replay
          </Typography>
        </DepthButton>
      </View>

      <View style={styles.sceneStage}>
        {/* Mascot + bubble on the same row */}
        <View style={styles.mascotBubbleRow}>
          {/* Mascot slides in from left */}
          <AnimatedEntrance preset="slideFromLeft" replayKey={key}>
            <Mascot size={84} autoPlayEntrance={false} />
          </AnimatedEntrance>

          {/* Bubble pops in after mascot; typewriter waits for bubble entrance */}
          <View style={styles.bubbleColumn}>
            <AnimatedEntrance preset="bubblePop" delay={300} replayKey={key}>
              <SpeechBubble
                autoPlay={false}
                tail={{ direction: 'left', offset: 0.4, depth: 12, size: 16 }}
              >
                <Typewriter
                  key={`typewriter-${key}`}
                  text="What's your daily learning goal? Pick a pace that feels right."
                  variant="body.m"
                  color="onyx"
                  startDelay={750}
                  onComplete={() => setShowOptions(true)}
                />
              </SpeechBubble>
            </AnimatedEntrance>
          </View>
        </View>

        {/* Options stagger in after typewriter completes */}
        {showOptions && (
          <>
            <View style={{ height: 16 }} />
            <StaggerGroup preset="slideFromRight" baseDelay={100} staggerInterval={80}>
              {[
                { id: '5', label: '5 min / day · Casual' },
                { id: '10', label: '10 min / day · Regular' },
                { id: '15', label: '15 min / day · Serious' },
                { id: '20', label: '20 min / day · Intense' },
              ].map((opt) => (
                <View key={opt.id} style={{ marginBottom: 12 }}>
                  <DepthButton
                    variant="tertiary-alt"
                    size="medium"
                    surfaceColor={selectedGoal === opt.id ? 'blueSecondary' : 'white'}
                    shadowColor={selectedGoal === opt.id ? 'bluePrimary' : 'blueSecondary'}
                    borderColor={selectedGoal === opt.id ? 'snow' : 'bluePrimary'}
                    pressEffect="none"
                    onPress={() => setSelectedGoal(opt.id)}
                  >
                    <Typography variant="label.s" color="onyx">
                      {opt.label}
                    </Typography>
                  </DepthButton>
                </View>
              ))}
            </StaggerGroup>

            {/* CTA rises from below */}
            <AnimatedEntrance preset="slideFromBottom" delay={450}>
              <DepthButton variant="primary" onPress={() => {}}>
                <Typography variant="label.m" color="white">
                  CONTINUE
                </Typography>
              </DepthButton>
            </AnimatedEntrance>
          </>
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Welcome screen simulation — 3-layer accordion with dynamic name
// ─────────────────────────────────────────────

function WelcomeSceneSection() {
  const [name, setName] = useState('Ahmed');
  const [key, setKey] = useState(0);

  return (
    <View style={styles.section}>
      <View style={styles.sceneHeader}>
        <Typography variant="heading.m" color="onyx" style={styles.sceneHeaderTitle}>
          Welcome · 3-layer accordion
        </Typography>
        <DepthButton
          variant="outline"
          size="small"
          isFullWidth={false}
          onPress={() => setKey((k) => k + 1)}
        >
          <Typography variant="label.xs" color="onyx">
            Replay
          </Typography>
        </DepthButton>
      </View>

      <TextInput
        style={styles.nameInput}
        value={name}
        onChangeText={setName}
        placeholder="Type a name..."
        placeholderTextColor={colors.textMuted}
      />

      <View style={styles.welcomeStage}>
        <WelcomeStackedText
          text={`Welcome, ${name || 'Friend'}!`}
          replayKey={key}
          layerOffset={4}
          size={42}
        />
      </View>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Typography variant="heading.m" color="onyx" style={styles.sectionTitle}>
        {title}
      </Typography>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.snow,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.xs,
  },
  variantRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  presetRow: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  presetMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  presetStage: {
    height: 80,
    backgroundColor: '#F8F8F8',
    borderRadius: radius.md,
    padding: spacing.md,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  presetBox: {
    backgroundColor: colors.bluePrimary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  sceneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sceneHeaderTitle: {
    flexShrink: 1,
  },
  sceneStage: {
    backgroundColor: '#FAFAFA',
    borderRadius: radius.lg,
    padding: spacing.lg,
    minHeight: 320,
  },
  mascotBubbleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  bubbleColumn: {
    flex: 1,
    flexShrink: 1,
  },
  nameInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 48,
    fontSize: 16,
    color: colors.onyx,
  },
  welcomeStage: {
    backgroundColor: colors.aspenGold,
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 200,
    justifyContent: 'center',
  },
});
