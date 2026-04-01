package expo.modules.devicehealth

import android.os.Process
import android.os.SystemClock
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DeviceHealthModule : Module() {

  /**
   * Previous snapshot for delta calculation.
   * Uses Process.getElapsedCpuTime() (app-specific, no /proc/stat permission needed).
   */
  private var prevCpuTimeMs: Long = 0
  private var prevWallTimeMs: Long = 0
  private var hasPreviousSnapshot = false

  override fun definition() = ModuleDefinition {
    Name("DeviceHealth")

    AsyncFunction("getCPUUsage") {
      val cpuTimeMs = Process.getElapsedCpuTime()   // ms of CPU consumed by this process
      val wallTimeMs = SystemClock.elapsedRealtime() // ms since boot (monotonic)
      val coreCount = Runtime.getRuntime().availableProcessors()

      var usagePercent = -1.0

      if (hasPreviousSnapshot) {
        val cpuDelta = cpuTimeMs - prevCpuTimeMs
        val wallDelta = wallTimeMs - prevWallTimeMs

        if (wallDelta > 0 && coreCount > 0) {
          // Normalize: cpuDelta is across all cores, so divide by coreCount for 0-100% range
          usagePercent = (cpuDelta.toDouble() / (wallDelta * coreCount)) * 100.0
          usagePercent = Math.round(usagePercent * 10.0) / 10.0
          // Clamp to 0-100 (can exceed 100 on burst scheduling)
          usagePercent = usagePercent.coerceIn(0.0, 100.0)
        }
      }

      prevCpuTimeMs = cpuTimeMs
      prevWallTimeMs = wallTimeMs
      hasPreviousSnapshot = true

      mapOf(
        "usagePercent" to usagePercent,
        "coreCount" to coreCount
      )
    }

    /** Reset stored snapshot (call when monitoring session ends) */
    Function("resetCPUSnapshot") {
      hasPreviousSnapshot = false
      prevCpuTimeMs = 0
      prevWallTimeMs = 0
    }
  }
}
