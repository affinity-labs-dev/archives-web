#!/bin/bash
# Batch script to add quiz sounds to remaining quiz files
# This applies the same pattern: import, hook init, playTap, playCorrect, playIncorrect

# List of remaining quiz files
QUIZ_FILES=(
  "components/modules/adventure3/Adventure3_Module1_Quiz.tsx"
  "components/modules/adventure3/Adventure3_Module2_Quiz.tsx"
  "components/modules/adventure3/Adventure3_Module3_Quiz.tsx"
  "components/modules/adventure4/Adventure4_Module1_Quiz.tsx"
  "components/modules/adventure4/Adventure4_Module2_Quiz.tsx"
  "components/modules/adventure4/Adventure4_Module3_Quiz.tsx"
  "components/modules/adventure5/Adventure5_Module1_Quiz.tsx"
  "components/modules/adventure5/Adventure5_Module2_Quiz.tsx"
  "components/modules/adventure5/Adventure5_Module3_Quiz.tsx"
  "components/modules/roiera2/ROIERA2Adv1_Module1_Quiz.tsx"
  "components/modules/roiera2/ROIERA2Adv1_Module2_Quiz.tsx"
)

for FILE in "${QUIZ_FILES[@]}"; do
  FULL_PATH="/Users/sunny/Downloads/IOS/Archives_Expo/$FILE"

  echo "Processing $FILE..."

  # 1. Add import after useProgress import
  if ! grep -q "import { useQuizSounds }" "$FULL_PATH"; then
    # Find the line with useProgress import and add useQuizSounds after it
    sed -i '' '/import { useProgress } from/a\
import { useQuizSounds } from '\''@/hooks/useQuizSounds'\''
' "$FULL_PATH"
    echo "  ✅ Added import"
  else
    echo "  ⏭️  Import already exists"
  fi

  # 2. Add hook initialization after useProgress hook
  if ! grep -q "const { playTap, playCorrect, playIncorrect } = useQuizSounds()" "$FULL_PATH"; then
    # Find lines with useProgress() and add useQuizSounds() after
    sed -i '' '/const { .* } = useProgress()/a\
  const { playTap, playCorrect, playIncorrect } = useQuizSounds()
' "$FULL_PATH"
    echo "  ✅ Added hook initialization"
  else
    echo "  ⏭️  Hook already initialized"
  fi

  # 3. Add playCorrect() after Success haptic
  sed -i '' '/Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)/a\
      playCorrect()
' "$FULL_PATH"
  echo "  ✅ Added playCorrect() calls"

  # 4. Add playIncorrect() after Error haptic
  sed -i '' '/Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)/a\
      playIncorrect()
' "$FULL_PATH"
  echo "  ✅ Added playIncorrect() calls"

  # 5. Add playTap() after Haptics.selectionAsync()
  sed -i '' '/Haptics.selectionAsync()/a\
              playTap()
' "$FULL_PATH"
  echo "  ✅ Added playTap() calls"

  echo "  ✅ Completed $FILE"
  echo ""
done

echo "🎉 All remaining quiz files updated!"
