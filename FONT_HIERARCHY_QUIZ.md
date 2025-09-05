# Font Hierarchy Implementation Guide - Quiz System

## Android Font Weight Issue & Solution

### Problem
Android cannot synthesize bold weights from regular fonts like iOS can. Using `fontWeight: '600'` with `fontFamily: 'DM Sans'` results in:
- **iOS**: Bold text displays correctly
- **Android**: Text appears regular weight (not bold)

### Solution
Use explicit bold font files instead of relying on `fontWeight` properties.

## Best Practices (React Native Paper & React Native Elements)

1. **Install each font variant as a separate file** - React Native Paper recommendation
2. **For Android the font weights MUST align with the used font** - React Native Elements
3. **Use explicit font families rather than fontWeight synthesis**

## Font Assets Available

```javascript
// From app/_layout.tsx font loading
"DM Sans": require("../assets/fonts/DM_Sans.ttf"),           // Regular
"DM-Sans-Bold": require("../assets/fonts/DM_Sans-Bold.ttf"), // Bold
"DMSans-Bold": require("../assets/fonts/DM_Sans-Bold.ttf"),  // Bold (alias)
"DM Sans Bold": require("../assets/fonts/DM_Sans-Bold.ttf"), // Bold (alias)
```

**Standard font naming**: `"DM Sans-Bold"` (used in ArchivesTheme)

## Quiz Component Font Updates

### QuizSystem.tsx Changes

#### 1. Quiz Title (Module X Quiz text)

**BEFORE (Incorrect - doesn't work on Android):**
```typescript
quizTitle: {
  fontFamily: 'DM Sans',
  fontSize: 20,
  fontWeight: '600',  // ❌ Android can't synthesize this
  color: ArchivesTheme.colors.mutedNavy,
},
```

**AFTER (Correct - works on both platforms):**
```typescript
quizTitle: {
  fontFamily: 'DM Sans-Bold',  // ✅ Explicit bold font file
  fontSize: 20,
  color: ArchivesTheme.colors.mutedNavy,
  // fontWeight removed - not needed with explicit bold font
},
```

#### 2. Question Text

**BEFORE (Incorrect - doesn't work on Android):**
```typescript
questionText: {
  fontFamily: 'DM Sans',
  fontSize: 20,
  fontWeight: '600',  // ❌ Android can't synthesize this
  color: ArchivesTheme.colors.shoeBrown,
  textAlign: 'center',
  marginBottom: 0,
  lineHeight: 28,
  paddingHorizontal: iOSLayout.questionTextHorizontalPadding,
},
```

**AFTER (Correct - works on both platforms):**
```typescript
questionText: {
  fontFamily: 'DM Sans-Bold',  // ✅ Explicit bold font file
  fontSize: 20,
  color: ArchivesTheme.colors.shoeBrown,
  textAlign: 'center',
  marginBottom: 0,
  lineHeight: 28,
  paddingHorizontal: iOSLayout.questionTextHorizontalPadding,
  // fontWeight removed - not needed with explicit bold font
},
```

## Implementation Checklist

For each quiz component, update these specific styles:

### QuizSystem.tsx
- [ ] `quizTitle` - Module title text
- [ ] `questionText` - Question text

### Individual Quiz Components (Adventure1_ModuleX_Quiz.tsx)
Check for any local style overrides that might use:
- [ ] `fontWeight: '600'` with regular fonts
- [ ] `fontWeight: 'bold'` with regular fonts
- [ ] Any other font weight synthesis

### Search Pattern
Use this grep command to find all instances that need updating:

```bash
# Find fontWeight usage with DM Sans regular font
grep -r "fontWeight.*['\"]600['\"]" components/modules/
grep -r "fontWeight.*bold" components/modules/
grep -r "fontFamily.*DM Sans['\"]" components/modules/
```

## Files That Need Updates

Based on current codebase structure:

### Adventure 1
- [ ] `components/modules/adventure1/Adventure1_Module1_Quiz.tsx` ✅ (QuizSystem already updated)
- [ ] `components/modules/adventure1/Adventure1_Module2_Quiz.tsx`
- [ ] `components/modules/adventure1/Adventure1_Module3_Quiz.tsx`

### Adventure 2  
- [ ] `components/modules/adventure2/Adventure2_Module1_Quiz.tsx`
- [ ] `components/modules/adventure2/Adventure2_Module2_Quiz.tsx`
- [ ] `components/modules/adventure2/Adventure2_Module3_Quiz.tsx`

### Adventure 3
- [ ] `components/modules/adventure3/Adventure3_Module1_Quiz.tsx`
- [ ] `components/modules/adventure3/Adventure3_Module2_Quiz.tsx` 
- [ ] `components/modules/adventure3/Adventure3_Module3_Quiz.tsx`

### Shared Components
- [x] `components/modules/QuizSystem.tsx` ✅ (Updated)

## Expected Results

### Before Fix
- **iOS**: Bold text displays correctly (font synthesis works)
- **Android**: Text appears regular weight (font synthesis fails)

### After Fix  
- **iOS**: No visual change (continues to display bold correctly)
- **Android**: Bold text now displays correctly, matching iOS
- **Bundle Size**: No impact (same font files already loaded)
- **Consistency**: Matches ArchivesTheme approach used throughout app

## Verification Steps

1. **Test on Android device/emulator**:
   - Module title should appear bold
   - Question text should appear bold
   - Compare with iOS to ensure visual consistency

2. **Test on iOS device/simulator**:
   - Should look identical to before (no regression)
   - Verify no font loading errors in console

3. **Bundle analysis** (optional):
   - Run `npx expo export` and verify no additional font files bundled
   - Same fonts already loaded in `app/_layout.tsx`

## Code Style Notes

- **Comment updates**: Replace font weight comments with platform compatibility notes
- **Consistency**: Use `'DM Sans-Bold'` naming (matches ArchivesTheme)
- **Clean up**: Remove unused `fontWeight` properties after font family changes

## Implementation Command

For systematic updates across all quiz files:

```bash
# 1. Find all quiz files
find components/modules -name "*Quiz.tsx" -type f

# 2. Search for problematic font patterns
grep -l "fontWeight.*600\|fontWeight.*bold" components/modules/*Quiz.tsx

# 3. Apply updates following this guide's patterns
```

---

**Created**: Based on Android font hierarchy research and QuizSystem.tsx implementation  
**Status**: Ready for rollout across all adventure modules  
**References**: React Native Paper, React Native Elements, Expo font documentation