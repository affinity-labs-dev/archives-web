import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";

import { Typography, colors } from "@/components/ui";

interface TodayEmptyStateProps {
  /** Whether the user is viewing a historical date (vs. today). */
  isHistoricalView: boolean;
}

/**
 * Empty-state shown when the active quest has no content available
 * (historical date with no quest, or today's quest hasn't been
 * published yet).
 */
export default function TodayEmptyState({
  isHistoricalView,
}: TodayEmptyStateProps) {
  const title = isHistoricalView ? "No Quest Available" : "No Quest Today";
  const message = isHistoricalView
    ? "There’s no daily content for this date. Try selecting a different day from the calendar."
    : "Check back tomorrow for a new daily quest!";

  return (
    <View style={styles.container}>
      <Ionicons
        name="calendar-outline"
        size={64}
        color={colors.acaiPrimary}
        style={styles.icon}
      />
      <Typography
        family="onest"
        weight="700"
        size={22}
        extraColor={colors.acaiPrimary}
        align="center"
        style={styles.title}
      >
        {title}
      </Typography>
      <Typography
        family="onest"
        weight="400"
        size={15}
        extraColor={colors.onyx}
        align="center"
        style={styles.message}
      >
        {message}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 80,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    marginBottom: 12,
  },
  message: {
    lineHeight: 22,
  },
});
