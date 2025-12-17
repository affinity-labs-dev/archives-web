// Simple markdown text renderer for React Native
// Handles basic markdown formatting: **bold**

import React from 'react';
import { Text, TextStyle } from 'react-native';

/**
 * Renders text with basic markdown support (bold with **)
 * @param text - The text to render with markdown
 * @param style - The base text style to apply
 * @returns JSX element with properly styled text
 */
export const renderMarkdownText = (text: string, style: TextStyle) => {
  // Split by **text** pattern (bold)
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <Text style={style}>
      {parts.map((part, index) => {
        // Check if this part is bold (wrapped in **)
        if (part.startsWith('**') && part.endsWith('**')) {
          const boldText = part.slice(2, -2);
          return (
            <Text key={index} style={{ fontWeight: '700' }}>
              {boldText}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
};
