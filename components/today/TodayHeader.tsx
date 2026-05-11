import React from "react";
import {
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { Typography, colors } from "@/components/ui";
import { useWalkthroughTarget } from "@/hooks/today/useWalkthroughTarget";

interface TodayHeaderProps {
  title: string;
  streak: number;
  onStreakPress: () => void;
  style?: StyleProp<ViewStyle>;
}

// Flame path from the Daily Story mock (Downloads/02 daily story/index.html:1124)
// Authored from the Figma Streak Variations SVG — 12×14 viewBox at origin 40,79.
const StreakFlameIcon = ({
  width = 15,
  height = 19,
  color = colors.acaiPrimary,
}: {
  width?: number;
  height?: number;
  color?: string;
}) => (
  <Svg width={width} height={height} viewBox="0 0 15 19" fill="none">
    <Path
      fill={color}
      d="M7.5 19C5.40625 19 3.63281 18.1897 2.17969 16.5691C0.726562 14.9485 0 12.9707 0 10.6357C0 8.66655 0.523438 6.77586 1.57031 4.96358C2.61719 3.1513 4.05469 1.56556 5.88281 0.206357C6.22656 -0.0550286 6.58203 -0.0680979 6.94922 0.167149C7.31641 0.402397 7.5 0.755268 7.5 1.22576V2.58497C7.5 3.17744 7.68359 3.67408 8.05078 4.07487C8.41797 4.47566 8.86719 4.67606 9.39844 4.67606C9.66406 4.67606 9.91797 4.61071 10.1602 4.48002C10.4023 4.34932 10.6172 4.162 10.8047 3.91804C10.9297 3.74378 11.0898 3.63487 11.2852 3.5913C11.4805 3.54774 11.6641 3.59566 11.8359 3.73507C12.8203 4.51922 13.5938 5.5212 14.1563 6.741C14.7188 7.9608 15 9.25902 15 10.6357C15 12.9707 14.2734 14.9485 12.8203 16.5691C11.3672 18.1897 9.59375 19 7.5 19ZM1.875 10.6357C1.875 11.5418 2.03906 12.4 2.36719 13.2103C2.69531 14.0206 3.16406 14.7307 3.77344 15.3406C3.75781 15.2535 3.75 15.1751 3.75 15.1054V14.8701C3.75 14.3125 3.84375 13.7897 4.03125 13.3018C4.21875 12.8139 4.49219 12.3695 4.85156 11.9687L7.5 9.06734L10.1484 11.9687C10.5078 12.3695 10.7812 12.8139 10.9688 13.3018C11.1562 13.7897 11.25 14.3125 11.25 14.8701V15.1054C11.25 15.1751 11.2422 15.2535 11.2266 15.3406C11.8359 14.7307 12.3047 14.0206 12.6328 13.2103C12.9609 12.4 13.125 11.5418 13.125 10.6357C13.125 9.76437 12.9805 8.941 12.6914 8.16556C12.4023 7.39011 11.9844 6.69744 11.4375 6.08754C11.125 6.31407 10.7969 6.48397 10.4531 6.59724C10.1094 6.71051 9.75781 6.76714 9.39844 6.76714C8.42969 6.76714 7.58984 6.40991 6.87891 5.69546C6.16797 4.98101 5.75781 4.10101 5.64844 3.05546C4.42969 4.20556 3.49609 5.42972 2.84766 6.72793C2.19922 8.02615 1.875 9.32872 1.875 10.6357ZM7.5 11.9949L6.16406 13.4586C5.99219 13.6503 5.85938 13.8681 5.76562 14.1121C5.67188 14.356 5.625 14.6087 5.625 14.8701C5.625 15.4277 5.80859 15.9069 6.17578 16.3077C6.54297 16.7085 6.98438 16.9089 7.5 16.9089C8.01562 16.9089 8.45703 16.7085 8.82422 16.3077C9.19141 15.9069 9.375 15.4277 9.375 14.8701C9.375 14.5913 9.32813 14.3343 9.23438 14.099C9.14063 13.8638 9.00781 13.6503 8.83594 13.4586L7.5 11.9949Z"
    />
  </Svg>
);

export default function TodayHeader({
  title,
  streak,
  onStreakPress,
  style,
}: TodayHeaderProps) {
  // Walkthrough target — step 1 spotlights this pill (with the calendar
  // week row as a secondary cutout). Wrapped in a View because the
  // overlay's measureInWindow is more reliable on a plain View than on
  // a TouchableOpacity (whose underlying host view differs across RN
  // versions). `collapsable={false}` prevents Android from flattening
  // this single-child wrapper into its parent at layout time.
  const streakRef = useWalkthroughTarget("streak");
  return (
    <View style={[styles.container, style]}>
      <View style={styles.titleWrap}>
        <Typography
          family="bounded"
          size={22}
          extraColor={colors.onyx}
          uppercase
        >
          {title}
        </Typography>
      </View>
      <View ref={streakRef} collapsable={false}>
        <TouchableOpacity
          style={styles.streakPill}
          onPress={onStreakPress}
          activeOpacity={0.7}
        >
          <StreakFlameIcon width={16} height={19} color={colors.acaiPrimary} />
          <Typography
            size={14}
            weight="700"
            extraColor={colors.acaiPrimary}
            style={styles.streakText}
          >
            {`${streak} ${streak === 1 ? "day" : "days"}`}
          </Typography>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleWrap: {
    flex: 1,
  },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  streakText: {
    fontFamily: "DM Sans",
    letterSpacing: 0.14,
  },
});
