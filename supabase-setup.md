# Supabase Integration Setup Guide

## Database Schema

### Table: `user_progress`

```sql
CREATE TABLE user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  adventure_id INTEGER NOT NULL,
  module_id INTEGER NOT NULL,
  lesson1_completed BOOLEAN DEFAULT false,
  lesson2_completed BOOLEAN DEFAULT false,
  quiz_attempts INTEGER DEFAULT 0,
  quiz_completed BOOLEAN DEFAULT false,
  quiz_score INTEGER DEFAULT 0,
  quiz_answers JSONB,
  total_questions INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  module_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, adventure_id, module_id)
);
```

### Sample Quiz Answers JSON Structure
```json
{
  "question1": { "answer": "A", "correct": true },
  "question2": { "answer": "B", "correct": false },
  "question3": { "answer": "C", "correct": true },
  "question4": { "answer": "D", "correct": true }
}
```

## Setup Process

### 1. Install Supabase Client
```bash
npm install @supabase/supabase-js
```

### 2. Environment Variables
Add to `.env.local`:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Supabase Client Configuration
Create `lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

## API Functions

### Progress Service Functions
Create `services/ProgressService.ts`:

```typescript
import { supabase } from '../lib/supabase'
import { useUser } from '@clerk/clerk-expo'

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
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('adventure_id', adventureId)
      .eq('module_id', moduleId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  // Complete a lesson
  async completeLesson(userId: string, adventureId: number, moduleId: number, lessonNumber: 1 | 2) {
    const lessonField = `lesson${lessonNumber}_completed`
    
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

    if (error) throw error
    return data
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
    const correctAnswers = Object.values(answers).filter(a => a.correct).length
    const quizCompleted = score >= 40 // 40% passing grade

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

    if (error) throw error

    // Check if module should be marked completed
    await this.checkModuleCompletion(userId, adventureId, moduleId)
    
    return data
  }

  // Check and update module completion
  async checkModuleCompletion(userId: string, adventureId: number, moduleId: number) {
    const progress = await this.getModuleProgress(userId, adventureId, moduleId)
    
    if (progress && 
        progress.lesson1_completed && 
        progress.lesson2_completed && 
        progress.quiz_completed) {
      
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

      if (error) throw error
      return data
    }
    
    return progress
  }

  // Get all progress for a user
  async getUserProgress(userId: string) {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .order('adventure_id')
      .order('module_id')

    if (error) throw error
    return data
  }

  // Get adventure completion status
  async getAdventureProgress(userId: string, adventureId: number) {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('adventure_id', adventureId)

    if (error) throw error

    const totalModules = 3
    const completedModules = data?.filter(m => m.module_completed).length || 0
    
    return {
      adventure_id: adventureId,
      total_modules: totalModules,
      completed_modules: completedModules,
      is_completed: completedModules === totalModules,
      modules: data || []
    }
  }
}

export const progressService = new ProgressService()
```

## Integration with Existing ProgressContext

### Update ProgressContext.tsx
Replace AsyncStorage calls with Supabase calls:

```typescript
// In ProgressContext.tsx
import { progressService } from '../services/ProgressService'
import { useUser } from '@clerk/clerk-expo'

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  // ... existing state

  const completeLesson = async (adventureId: number, moduleId: number, lessonId: string) => {
    if (!user?.id) return
    
    const lessonNumber = lessonId === 'lesson1' ? 1 : 2
    await progressService.completeLesson(user.id, adventureId, moduleId, lessonNumber)
    
    // Update local state...
  }

  const completeQuiz = async (
    adventureId: number, 
    moduleId: number, 
    score: number,
    answers: Record<string, { answer: string; correct: boolean }>
  ) => {
    if (!user?.id) return

    await progressService.saveQuizResults(
      user.id, 
      adventureId, 
      moduleId, 
      score, 
      answers,
      Object.keys(answers).length
    )
    
    // Update local state...
  }

  // ... rest of context
}
```

## Analytics Queries

### Get Quiz Performance Analytics
```typescript
// Get all quiz attempts for analytics
async getQuizAnalytics(userId?: string) {
  let query = supabase
    .from('user_progress')
    .select('adventure_id, module_id, quiz_score, quiz_attempts, correct_answers, total_questions')
    .not('quiz_score', 'is', null)

  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

// Get overall completion rates
async getCompletionRates() {
  const { data, error } = await supabase
    .from('user_progress')
    .select('adventure_id, module_id, module_completed')

  if (error) throw error
  return data
}
```

## Migration from AsyncStorage

### Data Migration Function
```typescript
async function migrateFromAsyncStorage(userId: string) {
  try {
    // Get existing AsyncStorage data
    const adventureData = await AsyncStorage.getItem('adventure_progress')
    const moduleData = await AsyncStorage.getItem('module_progress')
    
    if (adventureData && moduleData) {
      const adventures = JSON.parse(adventureData)
      const modules = JSON.parse(moduleData)
      
      // Convert and save to Supabase
      for (const module of modules) {
        await supabase.from('user_progress').upsert({
          user_id: userId,
          adventure_id: module.adventureId,
          module_id: module.moduleId,
          lesson1_completed: module.lessonsCompleted.includes('lesson1'),
          lesson2_completed: module.lessonsCompleted.includes('lesson2'),
          quiz_completed: module.quizCompleted,
          module_completed: module.isCompleted
        })
      }
    }
  } catch (error) {
    console.error('Migration failed:', error)
  }
}
```

## Security Setup

### Row Level Security (RLS)
Enable RLS on the table and create policies:

```sql
-- Enable RLS
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own data
CREATE POLICY "Users can view own progress" ON user_progress
  FOR SELECT USING (auth.uid()::text = user_id);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own progress" ON user_progress
  FOR ALL USING (auth.uid()::text = user_id);
```

## Testing Setup

### Test the Integration
```typescript
// Test function to verify Supabase connection
async function testSupabaseConnection() {
  try {
    const { user } = useUser()
    if (!user?.id) return

    // Test lesson completion
    await progressService.completeLesson(user.id, 1, 1, 1)
    console.log('✅ Lesson completion saved')

    // Test quiz results
    await progressService.saveQuizResults(
      user.id, 
      1, 
      1, 
      80, 
      {
        question1: { answer: 'A', correct: true },
        question2: { answer: 'B', correct: false }
      },
      2
    )
    console.log('✅ Quiz results saved')

    // Get progress
    const progress = await progressService.getUserProgress(user.id)
    console.log('✅ Progress retrieved:', progress)

  } catch (error) {
    console.error('❌ Supabase test failed:', error)
  }
}
```

## Next Steps

1. **Create Supabase project** at supabase.com
2. **Run the SQL** to create the `user_progress` table
3. **Install dependencies** and configure environment variables
4. **Create the service files** as outlined above
5. **Update ProgressContext** to use Supabase instead of AsyncStorage
6. **Test the integration** with a simple lesson completion
7. **Migrate existing data** from AsyncStorage to Supabase
8. **Deploy and test** cross-device synchronization

## Benefits After Implementation

- ✅ **Cross-device sync** - Progress saved across all user devices
- ✅ **Detailed analytics** - Track quiz performance, learning patterns
- ✅ **Data persistence** - Never lose user progress
- ✅ **Scalable** - Ready for thousands of users
- ✅ **Real-time** - Instant updates across devices
- ✅ **Secure** - Row-level security protects user data