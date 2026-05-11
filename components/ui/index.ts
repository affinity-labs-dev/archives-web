/**
 * Archives UI — design system primitives barrel export.
 *
 * Usage:
 *   import { Typography, DepthButton, OptionList } from '@/components/ui';
 *
 * Theme tokens:
 *   import { colors, spacing, typographyVariants } from '@/components/ui/theme';
 */

export * from './theme';

export { Typography } from './Typography';
export type { TypographyProps } from './Typography';

export { DepthButton } from './DepthButton';
export type {
  DepthButtonProps,
  DepthButtonVariant,
  DepthButtonSize,
  DepthButtonPressEffect,
  DepthButtonHaptic,
} from './DepthButton';

export { AuthButton } from './AuthButton';
export type { AuthButtonProps, AuthProvider } from './AuthButton';

export { OptionCard, OptionList } from './OptionCard';
export type {
  OptionCardProps,
  OptionListProps,
  OptionItem,
} from './OptionCard';

export { Typewriter, useTypewriter } from './Typewriter';
export type {
  TypewriterProps,
  UseTypewriterOptions,
  UseTypewriterResult,
} from './Typewriter';

export { SpeechBubble } from './SpeechBubble';
export type { SpeechBubbleProps, SpeechBubbleHandle } from './SpeechBubble';

export { ProgressBar } from './ProgressBar';
export type { ProgressBarProps } from './ProgressBar';

export { StatsBadge } from './StatsBadge';
export type { StatsBadgeProps } from './StatsBadge';

export { ReviewCard } from './ReviewCard';
export type { ReviewCardProps } from './ReviewCard';

export { PaginationDots } from './PaginationDots';
export type { PaginationDotsProps } from './PaginationDots';

export { ScrollFade } from './ScrollFade';
export type { ScrollFadeProps } from './ScrollFade';

export { ConfettiBurst } from './ConfettiBurst';
export type { ConfettiBurstHandle, ConfettiBurstProps } from './ConfettiBurst';

export { AnimatedCountUp } from './AnimatedCountUp';
export type { AnimatedCountUpProps } from './AnimatedCountUp';
