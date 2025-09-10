// Web implementation - no native Stripe components
import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Image, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import ArchivesTheme from '@/constants/ArchivesTheme'

export default function SubscribeContent() {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async () => {
    try {
      setLoading(true)
      
      // For web, we'll implement Stripe Checkout Sessions later
      Alert.alert(
        'Web Payments Coming Soon',
        `You selected the ${selectedPlan} plan. Web checkout will be implemented soon!`,
        [{ text: 'OK', onPress: () => {} }]
      )
      
    } catch (error) {
      console.error('Payment error:', error)
      Alert.alert('Error', 'Payment failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Explorer Pass Header */}
        <View style={styles.headerContainer}>
          <LinearGradient
            colors={[ArchivesTheme.colors.creamWhite, '#E8D5C4']}
            style={styles.headerGradient}
          >
            <Text style={styles.explorerTitle}>EXPLORER PASS</Text>
            <Text style={styles.explorerSubtitle}>PREMIUM ACCESS</Text>
          </LinearGradient>
        </View>

        {/* Character Illustration */}
        <View style={styles.characterContainer}>
          <View style={styles.characterFrame}>
            <Image
              source={require('@/assets/images/Explorer.png')}
              style={styles.explorerImage}
            />
          </View>
        </View>

        {/* Pricing Options - Interactive Selection */}
        <View style={styles.pricingContainer}>
          {/* Monthly Plan */}
          <TouchableOpacity 
            style={[
              styles.pricingOption,
              selectedPlan === 'monthly' && styles.pricingOptionSelected
            ]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <View style={styles.priceDisplayRow}>
              <Text style={styles.priceMain}>£4</Text>
              <Text style={styles.priceDecimal}>.99</Text>
            </View>
            <Text style={styles.originalPrice}>£9.99</Text>
            <Text style={styles.planDuration}>Monthly</Text>
            {selectedPlan === 'monthly' && (
              <View style={styles.selectedIndicator}>
                <Ionicons 
                  name="checkmark-circle" 
                  size={20} 
                  color={ArchivesTheme.colors.mossGreen} 
                />
              </View>
            )}
          </TouchableOpacity>
          
          {/* Vertical Separator */}
          <View style={styles.pricingSeparator} />
          
          {/* Yearly Plan */}
          <TouchableOpacity 
            style={[
              styles.pricingOption,
              selectedPlan === 'yearly' && styles.pricingOptionSelected
            ]}
            onPress={() => setSelectedPlan('yearly')}
          >
            <View style={styles.priceDisplayRow}>
              <Text style={styles.priceMain}>£49</Text>
              <Text style={styles.priceDecimal}>.99</Text>
            </View>
            <Text style={styles.originalPrice}>£89.99</Text>
            <Text style={styles.planDuration}>Yearly</Text>
            {selectedPlan === 'yearly' && (
              <View style={styles.selectedIndicator}>
                <Ionicons 
                  name="checkmark-circle" 
                  size={20} 
                  color={ArchivesTheme.colors.mossGreen} 
                />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Benefits Section */}
        <View style={styles.benefitsContainer}>
          <View style={styles.benefitRow}>
            <Ionicons name="checkmark-circle" size={18} color={ArchivesTheme.colors.mossGreen} />
            <Text style={styles.benefitText}>Unlimited access to all adventures</Text>
          </View>
          <View style={styles.benefitRow}>
            <Ionicons name="checkmark-circle" size={18} color={ArchivesTheme.colors.mossGreen} />
            <Text style={styles.benefitText}>Premium video content</Text>
          </View>
          <View style={styles.benefitRow}>
            <Ionicons name="checkmark-circle" size={18} color={ArchivesTheme.colors.mossGreen} />
            <Text style={styles.benefitText}>Interactive quizzes and assessments</Text>
          </View>
          <View style={styles.benefitRow}>
            <Ionicons name="checkmark-circle" size={18} color={ArchivesTheme.colors.mossGreen} />
            <Text style={styles.benefitText}>Download for offline learning</Text>
          </View>
        </View>

        {/* Subscribe Button */}
        <TouchableOpacity
          style={[styles.subscribeButton, loading && styles.subscribeButtonDisabled]}
          onPress={handleSubscribe}
          disabled={loading}
        >
          <LinearGradient
            colors={[ArchivesTheme.colors.mossGreen, '#7A8000']}
            style={styles.subscribeGradient}
          >
            <Text style={styles.subscribeButtonText}>
              {loading ? 'Processing...' : `Start ${selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'} Plan (Web Coming Soon)`}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.disclaimerText}>
          Web payments coming soon. Use mobile app for full functionality.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  headerGradient: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    ...ArchivesTheme.shadows.medium,
  },
  explorerTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 24,
    color: ArchivesTheme.colors.shoeBrown,
    letterSpacing: 2,
  },
  explorerSubtitle: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: ArchivesTheme.colors.mutedNavy,
    letterSpacing: 1,
    marginTop: 4,
  },
  characterContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  characterFrame: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...ArchivesTheme.shadows.large,
  },
  explorerImage: {
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  pricingContainer: {
    flexDirection: 'row',
    marginBottom: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 4,
    ...ArchivesTheme.shadows.medium,
  },
  pricingOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    position: 'relative',
  },
  pricingOptionSelected: {
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  pricingSeparator: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  priceDisplayRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  priceMain: {
    fontFamily: 'DMSans-Bold',
    fontSize: 32,
    color: ArchivesTheme.colors.shoeBrown,
  },
  priceDecimal: {
    fontFamily: 'DMSans-Bold',
    fontSize: 20,
    color: ArchivesTheme.colors.shoeBrown,
  },
  originalPrice: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: ArchivesTheme.colors.mutedNavy,
    textDecorationLine: 'line-through',
    marginBottom: 4,
  },
  planDuration: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: ArchivesTheme.colors.mutedNavy,
  },
  benefitsContainer: {
    marginBottom: 40,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 16,
    color: ArchivesTheme.colors.mutedNavy,
    marginLeft: 12,
  },
  subscribeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    ...ArchivesTheme.shadows.medium,
  },
  subscribeButtonDisabled: {
    opacity: 0.6,
  },
  subscribeGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  subscribeButtonText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  disclaimerText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'center',
    lineHeight: 18,
  },
})