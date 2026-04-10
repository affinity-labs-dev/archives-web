Pod::Spec.new do |s|
  s.name           = 'LiveActivity'
  s.version        = '0.1.0'
  s.summary        = 'Expo module bridging ActivityKit Live Activities to React Native'
  s.description    = 'Start/update/end StreakGuard and DailyStory Live Activities from JavaScript. iOS 16.2+ only.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  # Matches the main app deployment target (15.1). All ActivityKit APIs are
  # guarded by `if #available(iOS 16.2, *)` in Swift so older iOS silently no-ops.
  s.platforms      = {
    :ios => '15.1'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"

  # ActivityKit is a system framework, linked at compile time
  s.frameworks = 'ActivityKit'
end
