// AIAssistant.tsx - Wrapper component for floating AI chat
// Combines FloatingAIButton + AIChatModal + AIContext

import React from 'react';
import FloatingAIButton from './FloatingAIButton';
import AIChatModal from './AIChatModal';
import { useAI } from '@/gamification';
import { useUser } from '@clerk/clerk-expo';

export default function AIAssistant() {
  const {
    isChatOpen,
    openChat,
    closeChat,
    messages,
    currentContext,
    showFloatingButton,
  } = useAI();

  // Get user authentication status
  const { isSignedIn } = useUser();

  // Don't render if user is not logged in
  if (!isSignedIn) {
    return null;
  }

  // Don't render if floating button is hidden
  if (!showFloatingButton) {
    return null;
  }

  return (
    <>
      {/* Floating button - hide when chat is open */}
      {!isChatOpen && (
        <FloatingAIButton onPress={openChat} />
      )}

      {/* Chat modal */}
      <AIChatModal
        visible={isChatOpen}
        onClose={closeChat}
        initialMessages={messages}
        context={currentContext}
      />
    </>
  );
}
