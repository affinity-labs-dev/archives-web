// AIQuizExplanation.tsx - AI-powered quiz explanation component
// Shows personalized explanations for incorrect quiz answers

import { Question } from '@/components/shared/types';
import ArchivesTheme from '@/constants/ArchivesTheme';
import { aiService } from '@/services/AIService';
import { analyticsService } from '@/services/AnalyticsService';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { renderMarkdownText } from '@/utils/markdownText';

interface AIQuizExplanationProps {
  questions: Question[];
  userAnswers: number[]; // Array of user's answer indices
  eraName: string;
  adventureName?: string;
  adventureId: string;
  moduleId: string;
  onClose?: () => void;
}

interface ExplanationItem {
  questionNumber: number;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  aiExplanation?: string;
  loading: boolean;
  error?: string;
}

export default function AIQuizExplanation({
  questions,
  userAnswers,
  eraName,
  adventureName,
  adventureId,
  moduleId,
  onClose,
}: AIQuizExplanationProps) {
  const [explanations, setExplanations] = useState<ExplanationItem[]>([]);
  const [showExplanations, setShowExplanations] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  // Prepare explanation items on mount
  useEffect(() => {
    const items: ExplanationItem[] = questions.map((question, index) => {
      const userAnswerIndex = userAnswers[index];
      const correctAnswerIndex = question.answers.findIndex((a) => a.is_correct);
      const isCorrect = userAnswerIndex === correctAnswerIndex;

      return {
        questionNumber: index + 1,
        questionText: question.question_text,
        userAnswer: question.answers[userAnswerIndex]?.text || 'No answer',
        correctAnswer: question.answers[correctAnswerIndex]?.text || 'Unknown',
        isCorrect,
        loading: false,
      };
    });

    setExplanations(items);
  }, [questions, userAnswers]);

  // Generate AI explanations
  const handleGetExplanations = async () => {
    if (!aiService.isAvailable()) {
      alert('AI explanations are not available. Please contact support.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowExplanations(true);
    setLoadingAll(true);

    // Track AI explanation request
    analyticsService.trackCustomEvent('ai_quiz_explanation_requested', {
      adventure_id: adventureId,
      module_id: moduleId,
      era_name: eraName,
      total_questions: questions.length,
      incorrect_questions: explanations.filter((e) => !e.isCorrect).length,
    });

    console.log('🤖 [AIQuizExplanation] Requesting explanations for', questions.length, 'questions');

    // Animate in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    try {
      // Get explanations for all questions
      const aiExplanations = await aiService.getMultipleExplanations(questions, userAnswers, {
        eraName,
        adventureName,
        userLevel: 'intermediate', // TODO: Get from user profile
      });

      // Update explanations with AI responses
      setExplanations((prev) =>
        prev.map((item, index) => ({
          ...item,
          aiExplanation: aiExplanations[index]?.explanation,
          loading: false,
        }))
      );

      // Track successful generation
      analyticsService.trackCustomEvent('ai_quiz_explanation_generated', {
        adventure_id: adventureId,
        module_id: moduleId,
        era_name: eraName,
        explanations_count: aiExplanations.length,
      });

      console.log('✅ [AIQuizExplanation] Generated', aiExplanations.length, 'explanations');
    } catch (error) {
      console.error('❌ [AIQuizExplanation] Error generating explanations:', error);

      // Track error
      analyticsService.trackCustomEvent('ai_quiz_explanation_error', {
        adventure_id: adventureId,
        module_id: moduleId,
        era_name: eraName,
        error: String(error),
      });

      setExplanations((prev) =>
        prev.map((item) => ({
          ...item,
          loading: false,
          error: 'Could not generate explanation. Please try again.',
        }))
      );
    } finally {
      setLoadingAll(false);
    }
  };

  // Don't show if all answers are correct
  const incorrectCount = explanations.filter((e) => !e.isCorrect).length;
  if (incorrectCount === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {!showExplanations ? (
        // Initial prompt button
        <TouchableOpacity
          style={styles.promptCard}
          onPress={handleGetExplanations}
          activeOpacity={0.8}
        >
          <View style={styles.promptContent}>
            <View style={styles.aiIconContainer}>
              <Ionicons name="bulb" size={28} color={ArchivesTheme.colors.persianOrange} />
            </View>
            <View style={styles.promptTextContainer}>
              <Text style={styles.promptTitle}>Want to understand your mistakes?</Text>
              {/* <Text style={styles.promptSubtitle}>
                Get AI-powered explanations for {incorrectCount} incorrect {incorrectCount === 1 ? 'answer' : 'answers'}
              </Text> */}
            </View>
            <Ionicons name="chevron-forward" size={24} color={ArchivesTheme.colors.shoeBrown} />
          </View>
        </TouchableOpacity>
      ) : (
        // Explanations list
        <Animated.View style={[styles.explanationsContainer, { opacity: fadeAnim }]}>
          <View style={styles.explanationsHeader}>
            <Text style={styles.explanationsTitle}>AI Learning Assistant</Text>
            <Text style={styles.explanationsSubtitle}>
              Personalized explanations to help you learn
            </Text>
          </View>

          {loadingAll ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={ArchivesTheme.colors.persianOrange} />
              <Text style={styles.loadingText}>Generating explanations...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.explanationsList}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {explanations
                .filter((item) => !item.isCorrect) // Only show incorrect answers
                .map((item) => (
                  <View key={item.questionNumber} style={styles.explanationCard}>
                    {/* Question number badge */}
                    <View style={styles.questionBadge}>
                      <Text style={styles.questionBadgeText}>Q{item.questionNumber}</Text>
                    </View>

                    {/* Question text */}
                    <Text style={styles.questionText}>{item.questionText}</Text>

                    {/* User vs Correct answer */}
                    <View style={styles.answersContainer}>
                      <View style={styles.answerRow}>
                        <Ionicons name="close-circle" size={18} color="#E74C3C" />
                        <Text style={styles.answerLabel}>Your answer:</Text>
                        <Text style={styles.userAnswerText}>{item.userAnswer}</Text>
                      </View>
                      <View style={styles.answerRow}>
                        <Ionicons name="checkmark-circle" size={18} color="#27AE60" />
                        <Text style={styles.answerLabel}>Correct:</Text>
                        <Text style={styles.correctAnswerText}>{item.correctAnswer}</Text>
                      </View>
                    </View>

                    {/* AI Explanation */}
                    {item.loading ? (
                      <View style={styles.explanationLoading}>
                        <ActivityIndicator size="small" color={ArchivesTheme.colors.persianOrange} />
                      </View>
                    ) : item.error ? (
                      <Text style={styles.errorText}>{item.error}</Text>
                    ) : item.aiExplanation ? (
                      <View style={styles.aiExplanationContainer}>
                        <Ionicons name="bulb-outline" size={16} color={ArchivesTheme.colors.persianOrange} />
                        {renderMarkdownText(item.aiExplanation, styles.aiExplanationText)}
                      </View>
                    ) : null}
                  </View>
                ))}
            </ScrollView>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },

  // Prompt Card (before explanations shown)
  promptCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: ArchivesTheme.colors.persianOrange,
    shadowColor: 'black',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  promptContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(201, 145, 81, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  promptTextContainer: {
    flex: 1,
  },
  promptTitle: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
    marginBottom: 4,
  },
  promptSubtitle: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown,
  },

  // Explanations Container
  explanationsContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: 'black',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    maxHeight: 500,
  },
  explanationsHeader: {
    marginBottom: 16,
  },
  explanationsTitle: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.mutedNavy,
    marginBottom: 4,
  },
  explanationsSubtitle: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown,
  },

  // Loading State
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown,
    marginTop: 12,
  },

  // Explanations List
  explanationsList: {
    maxHeight: 400,
  },
  explanationCard: {
    backgroundColor: ArchivesTheme.colors.creamWhite,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  questionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: ArchivesTheme.colors.persianOrange,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  questionBadgeText: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  questionText: {
    fontFamily: 'DM Sans',
    fontSize: 15,
    fontWeight: '500',
    color: ArchivesTheme.colors.mutedNavy,
    marginBottom: 12,
  },

  // Answers
  answersContainer: {
    marginBottom: 12,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  answerLabel: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    color: ArchivesTheme.colors.shoeBrown,
    marginLeft: 6,
    marginRight: 4,
  },
  userAnswerText: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    color: '#E74C3C',
    flex: 1,
  },
  correctAnswerText: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    color: '#27AE60',
    flex: 1,
    fontWeight: '500',
  },

  // AI Explanation
  aiExplanationContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  aiExplanationText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: ArchivesTheme.colors.mutedNavy,
    lineHeight: 20,
    marginLeft: 8,
    flex: 1,
  },

  // Error State
  explanationLoading: {
    padding: 12,
    alignItems: 'center',
  },
  errorText: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    color: '#E74C3C',
    textAlign: 'center',
  },
});
