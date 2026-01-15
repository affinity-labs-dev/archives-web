// CelebrationManager.tsx - Renders all celebration UI (XP milestones, adventure complete, achievements)
// Separates UI from engine logic
import React from 'react';
import { Modal } from 'react-native';
import { useGamificationOrchestrator } from '@/gamification/engines/GamificationOrchestrator';
import XPMilestoneScreen from './XPMilestoneScreen';
import AdventureCompleteScreen from './AdventureCompleteScreen';
import { AchievementUnlockAnimation } from '@/gamification/ui/achievement/AchievementGrid';

/**
 * CelebrationManager - Handles rendering all gamification celebrations
 *
 * This component consumes celebration state from GamificationOrchestrator
 * and renders the appropriate celebration screen.
 *
 * Celebration Types:
 * - XP_MILESTONE: User reached XP milestone (50, 100, 200, 500, 1000)
 * - ADVENTURE_COMPLETE: User completed all modules in an adventure
 * - ACHIEVEMENT: User unlocked an achievement
 */
export default function CelebrationManager() {
  const { currentCelebration, dismissCurrentCelebration } = useGamificationOrchestrator();

  return (
    <>
      {/* XP Milestone Modal */}
      <Modal
        visible={currentCelebration?.type === 'XP_MILESTONE'}
        animationType="fade"
        presentationStyle="fullScreen"
        statusBarTranslucent
      >
        {currentCelebration?.type === 'XP_MILESTONE' && (
          <XPMilestoneScreen
            milestoneXP={currentCelebration.milestoneXP}
            totalXP={currentCelebration.totalXP}
            eraId={currentCelebration.eraId}
            onContinue={dismissCurrentCelebration}
          />
        )}
      </Modal>

      {/* Adventure Complete Modal */}
      <Modal
        visible={currentCelebration?.type === 'ADVENTURE_COMPLETE'}
        animationType="fade"
        presentationStyle="fullScreen"
        statusBarTranslucent
      >
        {currentCelebration?.type === 'ADVENTURE_COMPLETE' && (
          <AdventureCompleteScreen
            adventureTitle={currentCelebration.adventureTitle}
            adventureSubtitle={currentCelebration.adventureSubtitle}
            adventureDescription={currentCelebration.adventureDescription}
            backgroundImage={currentCelebration.backgroundImage}
            completedModules={currentCelebration.completedModules}
            totalModules={currentCelebration.totalModules}
            totalXP={currentCelebration.totalXP}
            totalBadges={currentCelebration.totalBadges}
            onContinue={dismissCurrentCelebration}
            onClose={dismissCurrentCelebration}
          />
        )}
      </Modal>

      {/* Achievement Unlock Animation */}
      {currentCelebration?.type === 'ACHIEVEMENT' && (
        <AchievementUnlockAnimation
          visible={true}
          achievement={currentCelebration.achievement}
          onDismiss={dismissCurrentCelebration}
          autoDismiss={true}
        />
      )}
    </>
  );
}
