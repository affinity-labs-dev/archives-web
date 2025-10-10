#!/bin/bash
# Batch script to replace Haptics.selectionAsync() with Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
# across all quiz files

# List of all quiz files (Adventures 1-5)
QUIZ_FILES=(
  "components/modules/adventure1/Adventure1_Module1_Quiz.tsx"
  "components/modules/adventure1/Adventure1_Module2_Quiz.tsx"
  "components/modules/adventure1/Adventure1_Module3_Quiz.tsx"
  "components/modules/adventure2/Adventure2_Module1_Quiz.tsx"
  "components/modules/adventure2/Adventure2_Module2_Quiz.tsx"
  "components/modules/adventure2/Adventure2_Module3_Quiz.tsx"
  "components/modules/adventure3/Adventure3_Module1_Quiz.tsx"
  "components/modules/adventure3/Adventure3_Module2_Quiz.tsx"
  "components/modules/adventure3/Adventure3_Module3_Quiz.tsx"
  "components/modules/adventure4/Adventure4_Module1_Quiz.tsx"
  "components/modules/adventure4/Adventure4_Module2_Quiz.tsx"
  "components/modules/adventure4/Adventure4_Module3_Quiz.tsx"
  "components/modules/adventure5/Adventure5_Module1_Quiz.tsx"
  "components/modules/adventure5/Adventure5_Module2_Quiz.tsx"
  "components/modules/adventure5/Adventure5_Module3_Quiz.tsx"
)

echo "🔄 Updating haptic feedback in quiz files..."
echo ""

for FILE in "${QUIZ_FILES[@]}"; do
  FULL_PATH="/Users/sunny/Downloads/IOS/Archives_Expo/$FILE"

  echo "Processing $FILE..."

  # Replace Haptics.selectionAsync() with Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  sed -i '' 's/Haptics\.selectionAsync()/Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)/g' "$FULL_PATH"

  echo "  ✅ Replaced haptics with Medium impact"
  echo ""
done

echo "🎉 All quiz files updated with Medium impact haptics!"
