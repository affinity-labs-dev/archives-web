import { supabase } from '../lib/supabase'

interface ProgressData {
  user_id: string
  adventure_id: number
  module_id: number
  lesson1_completed?: boolean
  lesson2_completed?: boolean
  quiz_attempts?: number
  quiz_completed?: boolean
  quiz_score?: number
  quiz_answers?: Record<string, { answer: string; correct: boolean }>
  total_questions?: number
  correct_answers?: number
  module_completed?: boolean
}

class ProgressService {
  // Get user progress for specific module
  async getModuleProgress(userId: string, adventureId: number, moduleId: number) {
    try {
      console.log(`📖 Getting progress for user ${userId}, adventure ${adventureId}, module ${moduleId}`);
      
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('adventure_id', adventureId)
        .eq('module_id', moduleId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('❌ Error getting module progress:', error);
        throw error;
      }
      
      console.log('✅ Module progress retrieved:', data);
      return data
    } catch (error) {
      console.error('❌ Failed to get module progress:', error);
      throw error;
    }
  }

  // Complete a lesson
  async completeLesson(userId: string, adventureId: number, moduleId: number, lessonNumber: 1 | 2) {
    try {
      const lessonField = `lesson${lessonNumber}_completed`
      console.log(`📝 Completing lesson ${lessonNumber} for user ${userId}, adventure ${adventureId}, module ${moduleId}`);
      
      const { data, error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: userId,
          adventure_id: adventureId,
          module_id: moduleId,
          [lessonField]: true
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Error completing lesson:', error);
        throw error;
      }
      
      console.log(`✅ Lesson ${lessonNumber} completed successfully:`, data);
      return data
    } catch (error) {
      console.error('❌ Failed to complete lesson:', error);
      throw error;
    }
  }

  // Save quiz results
  async saveQuizResults(
    userId: string, 
    adventureId: number, 
    moduleId: number, 
    score: number,
    answers: Record<string, { answer: string; correct: boolean }>,
    totalQuestions: number
  ) {
    try {
      const correctAnswers = Object.values(answers).filter(a => a.correct).length
      const quizCompleted = score >= 40 // 40% passing grade
      
      console.log(`📊 Saving quiz results for user ${userId}, adventure ${adventureId}, module ${moduleId}`);
      console.log(`📊 Score: ${score}%, Correct: ${correctAnswers}/${totalQuestions}, Passed: ${quizCompleted}`);

      // Get current progress to increment attempts
      const currentProgress = await this.getModuleProgress(userId, adventureId, moduleId)
      const attempts = (currentProgress?.quiz_attempts || 0) + 1

      const { data, error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: userId,
          adventure_id: adventureId,
          module_id: moduleId,
          quiz_attempts: attempts,
          quiz_completed: quizCompleted,
          quiz_score: score,
          quiz_answers: answers,
          total_questions: totalQuestions,
          correct_answers: correctAnswers
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Error saving quiz results:', error);
        throw error;
      }

      console.log('✅ Quiz results saved successfully:', data);

      // Check if module should be marked completed
      await this.checkModuleCompletion(userId, adventureId, moduleId)
      
      return data
    } catch (error) {
      console.error('❌ Failed to save quiz results:', error);
      throw error;
    }
  }

  // Check and update module completion
  async checkModuleCompletion(userId: string, adventureId: number, moduleId: number) {
    try {
      console.log(`🔍 Checking module completion for user ${userId}, adventure ${adventureId}, module ${moduleId}`);
      
      const progress = await this.getModuleProgress(userId, adventureId, moduleId)
      
      if (progress && 
          progress.lesson1_completed && 
          progress.lesson2_completed && 
          progress.quiz_completed) {
        
        console.log('🎯 Module completion criteria met! Marking as completed...');
        
        const { data, error } = await supabase
          .from('user_progress')
          .update({
            module_completed: true,
            completed_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('adventure_id', adventureId)
          .eq('module_id', moduleId)
          .select()
          .single()

        if (error) {
          console.error('❌ Error updating module completion:', error);
          throw error;
        }
        
        console.log('✅ Module marked as completed!', data);
        return data
      } else {
        console.log('⏳ Module completion criteria not yet met:', {
          lesson1: progress?.lesson1_completed,
          lesson2: progress?.lesson2_completed,
          quiz: progress?.quiz_completed
        });
      }
      
      return progress
    } catch (error) {
      console.error('❌ Failed to check module completion:', error);
      throw error;
    }
  }

  // Get all progress for a user
  async getUserProgress(userId: string) {
    try {
      console.log(`📊 Getting all progress for user ${userId}`);
      
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .order('adventure_id')
        .order('module_id')

      if (error) {
        console.error('❌ Error getting user progress:', error);
        throw error;
      }
      
      console.log(`✅ Retrieved ${data?.length || 0} progress records for user`);
      return data
    } catch (error) {
      console.error('❌ Failed to get user progress:', error);
      throw error;
    }
  }

  // Get adventure completion status
  async getAdventureProgress(userId: string, adventureId: number) {
    try {
      console.log(`🏛️ Getting adventure ${adventureId} progress for user ${userId}`);
      
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('adventure_id', adventureId)

      if (error) {
        console.error('❌ Error getting adventure progress:', error);
        throw error;
      }

      const totalModules = 3
      const completedModules = data?.filter(m => m.module_completed).length || 0
      
      const result = {
        adventure_id: adventureId,
        total_modules: totalModules,
        completed_modules: completedModules,
        is_completed: completedModules === totalModules,
        modules: data || []
      }
      
      console.log(`✅ Adventure ${adventureId} progress:`, result);
      return result
    } catch (error) {
      console.error('❌ Failed to get adventure progress:', error);
      throw error;
    }
  }

  // Test function to verify service is working
  async testService(userId: string) {
    try {
      console.log('🧪 Testing ProgressService...');
      
      // Test 1: Complete a lesson
      await this.completeLesson(userId, 1, 1, 1);
      console.log('✅ Test 1: Lesson completion - PASSED');
      
      // Test 2: Save quiz results
      await this.saveQuizResults(
        userId, 
        1, 
        1, 
        80, 
        {
          question1: { answer: 'A', correct: true },
          question2: { answer: 'B', correct: false },
          question3: { answer: 'C', correct: true }
        },
        3
      );
      console.log('✅ Test 2: Quiz results - PASSED');
      
      // Test 3: Get progress
      const progress = await this.getUserProgress(userId);
      console.log('✅ Test 3: Get progress - PASSED');
      
      console.log('🎯 All ProgressService tests passed!');
      return true;
    } catch (error) {
      console.error('❌ ProgressService test failed:', error);
      return false;
    }
  }
}

export const progressService = new ProgressService()