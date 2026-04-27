import type { StyleProp, ViewStyle } from 'react-native';

export interface OptionCardProps {
  /** Label text displayed inside the card. */
  label: string;

  /** Whether the card is in selected state. */
  isSelected: boolean;

  /** Tap handler — toggles selection in parent. */
  onPress: () => void;

  /** Zero-based index used to compute stagger delay. */
  animationIndex?: number;

  /** Whether to play entrance animation on mount. Default `true`. */
  animateIn?: boolean;

  /** When toggled `true`, triggers exit swipe animation. */
  exitSignal?: boolean;

  /** Outer wrapper style. */
  style?: StyleProp<ViewStyle>;

  /** Disables interaction. */
  isDisabled?: boolean;
}

export interface OptionItem {
  id: string;
  label: string;
}

export interface OptionListProps {
  options: OptionItem[];

  /** Single-select returns last-selected id; multi-select returns set of ids. */
  selectionMode: 'single' | 'multi';

  /** Current selection — `string | null` for single, `string[]` for multi. */
  value: string | string[] | null;

  /** Called with updated selection. */
  onChange: (next: string | string[] | null) => void;

  /** Set true to trigger exit animation before navigating away. */
  exitSignal?: boolean;

  /** Whether to animate entrance. Default `true`. */
  animateIn?: boolean;

  /** Vertical gap between cards. Default `12`. */
  gap?: number;
}
