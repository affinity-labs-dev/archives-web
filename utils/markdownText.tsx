// Simple markdown text renderer for React Native
// Handles basic markdown formatting: **bold** and *emphasis*

import React from 'react';
import { Text, TextStyle } from 'react-native';

/**
 * Renders text with basic markdown support (bold with ** or *)
 * @param text - The text to render with markdown
 * @param style - The base text style to apply
 * @returns JSX element with properly styled text
 */
export const renderMarkdownText = (text: string, style: TextStyle) => {
  // Combined regex to match both **bold** and *emphasis* patterns
  // Process double asterisks first to avoid conflicts
  // Match: **text** (bold) or *text* (emphasis) - but not ***
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

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
        // Check if this part is emphasis (wrapped in single *)
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
          const emphasisText = part.slice(1, -1);
          return (
            <Text key={index} style={{ fontWeight: '600' }}>
              {emphasisText}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
};
