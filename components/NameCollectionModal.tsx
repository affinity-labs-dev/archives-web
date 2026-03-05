import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import ArchivesTheme from '@/constants/ArchivesTheme'

interface NameCollectionModalProps {
  isVisible: boolean
  onSubmit: (firstName: string, lastName: string) => Promise<void>
  onCancel: () => void
  userEmail?: string
}

export const NameCollectionModal: React.FC<NameCollectionModalProps> = ({
  isVisible,
  onSubmit,
  onCancel,
  userEmail,
}) => {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError('')

    // Validation
    if (!firstName.trim()) {
      setError('Please enter your first name')
      return
    }
    if (!lastName.trim()) {
      setError('Please enter your last name')
      return
    }

    try {
      setIsLoading(true)
      await onSubmit(firstName.trim(), lastName.trim())
      // Reset form on success
      setFirstName('')
      setLastName('')
    } catch (err: any) {
      console.error('Name submission error:', err)
      setError(err.message || 'Failed to complete sign up. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Reset form
    setFirstName('')
    setLastName('')
    setError('')
    onCancel()
  }

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity style={styles.closeButton} onPress={handleCancel}>
                  <Ionicons name="close" size={24} color={ArchivesTheme.colors.mutedNavy} />
                </TouchableOpacity>
                
                <View style={styles.iconContainer}>
                  <Ionicons name="person-add" size={32} color={ArchivesTheme.colors.persianOrange} />
                </View>
                
                <Text style={styles.title}>Complete Your Profile</Text>
                <Text style={styles.subtitle}>
                  We need your name to finish setting up your account
                  {userEmail ? ` for ${userEmail}` : ''}
                </Text>
              </View>

              {/* Error message */}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {/* Form */}
              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>First Name</Text>
                  <TextInput
                    style={styles.input}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Enter your first name"
                    placeholderTextColor={ArchivesTheme.colors.mutedNavy + '99'}
                    autoCapitalize="words"
                    autoComplete="given-name"
                    returnKeyType="next"
                    editable={!isLoading}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Last Name</Text>
                  <TextInput
                    style={styles.input}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Enter your last name"
                    placeholderTextColor={ArchivesTheme.colors.mutedNavy + '99'}
                    autoCapitalize="words"
                    autoComplete="family-name"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                    editable={!isLoading}
                  />
                </View>
              </View>

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.submitButton, isLoading && styles.buttonDisabled]}
                  onPress={handleSubmit}
                  disabled={isLoading}
                >
                  <Text style={styles.submitButtonText}>
                    {isLoading ? 'Completing Sign Up...' : 'Complete Sign Up'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancel}
                  disabled={isLoading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>

              {/* Information note */}
              <View style={styles.noteContainer}>
                <Ionicons name="information-circle-outline" size={16} color={ArchivesTheme.colors.shoeBrown} />
                <Text style={styles.noteText}>
                  This information is required to create your Archives account and track your learning progress.
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(139,96,64,0.1)',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: ArchivesTheme.colors.shoeBrown,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontFamily: 'DM Sans',
    fontSize: 24,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    color: ArchivesTheme.colors.shoeBrown,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
    lineHeight: 20,
    fontFamily: 'DM Sans',
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: ArchivesTheme.colors.shoeBrown + '30', // 30% opacity
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'DM Sans',
    backgroundColor: 'white',
    color: ArchivesTheme.colors.mutedNavy,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 24,
  },
  submitButton: {
    backgroundColor: ArchivesTheme.colors.persianOrange,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: ArchivesTheme.colors.persianOrange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'DM Sans',
  },
  cancelButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: ArchivesTheme.colors.shoeBrown,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'DM Sans',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(195, 145, 81, 0.1)', // Light persianOrange background
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: ArchivesTheme.colors.shoeBrown,
    lineHeight: 16,
    fontFamily: 'DM Sans',
  },
})