package expo.modules.devicehealth

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.RandomAccessFile

class DeviceHealthModule : Module() {

  /** Previous CPU tick snapshot for delta calculation */
  private var prevTotal: Long = 0
  private var prevIdle: Long = 0
  private var hasPreviousSnapshot = false

  override fun definition() = ModuleDefinition {
    Name("DeviceHealth")

    AsyncFunction("getCPUUsage") {
      val cpuLine = RandomAccessFile("/proc/stat", "r").use { reader ->
        reader.readLine() // "cpu  user nice system idle iowait irq softirq steal ..."
      }

      // Parse tick values — skip the leading "cpu" label
      val ticks = cpuLine.split("\\s+".toRegex())
        .drop(1)
        .filter { it.isNotEmpty() }
        .map { it.toLong() }

      // indices: 0=user  1=nice  2=system  3=idle  4=iowait  5=irq  6=softirq  7=steal
      val idle = ticks[3] + ticks[4]
      val total = ticks.sum()

      var usagePercent = -1.0

      if (hasPreviousSnapshot) {
        val deltaTotal = total - prevTotal
        val deltaIdle = idle - prevIdle
        if (deltaTotal > 0) {
          usagePercent = ((deltaTotal - deltaIdle).toDouble() / deltaTotal) * 100.0
          usagePercent = Math.round(usagePercent * 10.0) / 10.0
        }
      }

      prevTotal = total
      prevIdle = idle
      hasPreviousSnapshot = true

      mapOf(
        "usagePercent" to usagePercent,
        "coreCount" to Runtime.getRuntime().availableProcessors()
      )
    }

    /** Reset stored snapshot (call when monitoring session ends) */
    Function("resetCPUSnapshot") {
      hasPreviousSnapshot = false
      prevTotal = 0
      prevIdle = 0
    }
  }
}
