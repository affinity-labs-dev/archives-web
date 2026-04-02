package expo.modules.devicehealth

import android.net.TrafficStats
import android.os.Process
import android.os.SystemClock
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.net.HttpURLConnection
import java.net.URL

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

    // ── Network Traffic Stats ──────────────────────────────────────

    /**
     * Read cumulative network byte counters for this app's UID.
     * Uses TrafficStats which reads from /proc/net/xt_qtaguid/stats.
     * Returns { bytesReceived, bytesSent } — cumulative since device boot.
     * JS layer calculates delta between polls to get throughput.
     */
    Function("getNetworkStats") {
      val uid = Process.myUid()
      val rxBytes = TrafficStats.getUidRxBytes(uid)
      val txBytes = TrafficStats.getUidTxBytes(uid)

      mapOf(
        "bytesReceived" to if (rxBytes != TrafficStats.UNSUPPORTED.toLong()) rxBytes else -1L,
        "bytesSent" to if (txBytes != TrafficStats.UNSUPPORTED.toLong()) txBytes else -1L
      )
    }

    // ── Speed Test ──────────────────────────────────────────────────

    /**
     * Download a file from a URL and measure throughput.
     * Downloads the entire response for accurate measurement.
     * Returns { downloadSpeedMbps, bytesDownloaded, durationMs }
     */
    AsyncFunction("runSpeedTest") { testUrl: String ->
      val connectTimeoutMs = 15_000
      val readTimeoutMs = 15_000

      var connection: HttpURLConnection? = null

      try {
        val url = URL(testUrl)
        connection = url.openConnection() as HttpURLConnection
        connection.requestMethod = "GET"
        connection.connectTimeout = connectTimeoutMs
        connection.readTimeout = readTimeoutMs
        connection.useCaches = false

        val startTime = SystemClock.elapsedRealtime()
        connection.connect()

        val inputStream = connection.inputStream
        val buffer = ByteArray(8192)
        var totalBytesRead = 0

        while (true) {
          val bytesRead = inputStream.read(buffer)
          if (bytesRead == -1) break
          totalBytesRead += bytesRead
        }

        inputStream.close()
        val endTime = SystemClock.elapsedRealtime()
        val durationMs = endTime - startTime

        var speedMbps = -1.0
        if (totalBytesRead > 0 && durationMs > 0) {
          speedMbps = (totalBytesRead.toDouble() * 8.0) / (durationMs * 1000.0)
          speedMbps = Math.round(speedMbps * 100.0) / 100.0
        }

        mapOf(
          "downloadSpeedMbps" to speedMbps,
          "bytesDownloaded" to totalBytesRead,
          "durationMs" to durationMs.toDouble()
        )
      } catch (e: Exception) {
        android.util.Log.w("DeviceHealth", "Speed test failed: ${e.message}")
        mapOf(
          "downloadSpeedMbps" to -1.0,
          "bytesDownloaded" to 0,
          "durationMs" to -1.0
        )
      } finally {
        try { connection?.disconnect() } catch (_: Exception) {}
      }
    }

    /** Reset stored snapshot (call when monitoring session ends) */
    Function("resetCPUSnapshot") {
      hasPreviousSnapshot = false
      prevCpuTimeMs = 0
      prevWallTimeMs = 0
    }
  }
}
