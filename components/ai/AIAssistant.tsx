// AIAssistant.tsx - Wrapper component for floating AI chat
// Combines FloatingAIButton + AIChatModal + AIContext

import React from 'react';
import FloatingAIButton from './FloatingAIButton';
import AIChatModal from './AIChatModal';
import { useAI } from '@/context/AIContext';

export default function AIAssistant() {
  const {
    isChatOpen,
    openChat,
    closeChat,
    messages,
    currentContext,
    showFloatingButton,
  } = useAI();

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
