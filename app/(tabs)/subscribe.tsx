// Subscribe Tab - Cross-platform wrapper that imports platform-specific components
import { Platform } from 'react-native'

// Explicitly import platform-specific components to ensure proper resolution
const SubscribeContent = Platform.select({
  native: () => require('@/components/SubscribeContent.native').default,
  web: () => require('@/components/SubscribeContent.web').default,
  default: () => require('@/components/SubscribeContent.native').default,
})()

export default SubscribeContent