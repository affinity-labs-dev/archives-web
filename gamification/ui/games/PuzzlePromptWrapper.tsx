// PuzzlePromptWrapper.tsx
// Wrapper component that shows PuzzlePrompt and handles GameHub integration
// Should be added to app layout to be always available

import React, { useState } from 'react';
import { usePuzzleEngagement } from '@/gamification';
import PuzzlePrompt from './PuzzlePrompt';
import GameHub from './GameHub';

export default function PuzzlePromptWrapper() {
  const {
    showPuzzlePrompt,
    promptReason,
    dismissPrompt,
    acceptPrompt,
  } = usePuzzleEngagement();

  const [showGameHub, setShowGameHub] = useState(false);

  const handleAccept = () => {
    acceptPrompt(); // Mark as accepted in analytics
    setShowGameHub(true); // Open GameHub
  };

  const handleGameHubClose = () => {
    setShowGameHub(false);
  };

  return (
    <>
      {/* Puzzle Prompt Toast */}
      <PuzzlePrompt
        visible={showPuzzlePrompt}
        reason={promptReason}
        onAccept={handleAccept}
        onDismiss={dismissPrompt}
      />

      {/* GameHub Modal */}
      <GameHub
        visible={showGameHub}
        onClose={handleGameHubClose}
        initialGameType="jigsaw"
        initialTopic="Islamic History"
      />
    </>
  );
}
