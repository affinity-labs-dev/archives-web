// Subscribe Tab - Cross-platform wrapper that imports platform-specific components
import { Platform } from 'react-native'

// Import native component only (web file removed)
const SubscribeContent = Platform.select({
  native: () => require('@/components/SubscribeContent.native').default,
  default: () => require('@/components/SubscribeContent.native').default,
})()

export default SubscribeContent