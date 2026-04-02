import ExpoModulesCore
import Darwin
import Foundation
import MachO

public class DeviceHealthModule: Module {

  /// Previous CPU tick snapshot for delta calculation
  private var prevUserTicks: UInt32 = 0
  private var prevSystemTicks: UInt32 = 0
  private var prevIdleTicks: UInt32 = 0
  private var prevNiceTicks: UInt32 = 0
  private var hasPreviousSnapshot = false

  public func definition() -> ModuleDefinition {
    Name("DeviceHealth")

    AsyncFunction("getCPUUsage") { () -> [String: Any] in
      let loadInfo = try self.hostCPULoadInfo()

      let user = loadInfo.cpu_ticks.0
      let system = loadInfo.cpu_ticks.1
      let idle = loadInfo.cpu_ticks.2
      let nice = loadInfo.cpu_ticks.3

      var usagePercent: Double = -1

      if self.hasPreviousSnapshot {
        let userDelta = Double(user &- self.prevUserTicks)
        let systemDelta = Double(system &- self.prevSystemTicks)
        let idleDelta = Double(idle &- self.prevIdleTicks)
        let niceDelta = Double(nice &- self.prevNiceTicks)

        let totalDelta = userDelta + systemDelta + idleDelta + niceDelta
        if totalDelta > 0 {
          usagePercent = ((userDelta + systemDelta + niceDelta) / totalDelta) * 100.0
        }
      }

      self.prevUserTicks = user
      self.prevSystemTicks = system
      self.prevIdleTicks = idle
      self.prevNiceTicks = nice
      self.hasPreviousSnapshot = true

      return [
        "usagePercent": round(usagePercent * 10) / 10,
        "coreCount": ProcessInfo.processInfo.activeProcessorCount,
      ]
    }

    // MARK: - Network Traffic Stats

    /// Read cumulative network byte counters from OS.
    /// Uses getifaddrs() to sum bytes across all network interfaces.
    /// Returns { bytesReceived, bytesSent } — cumulative since device boot.
    /// JS layer calculates delta between polls to get throughput.
    Function("getNetworkStats") { () -> [String: Any] in
      var bytesReceived: UInt64 = 0
      var bytesSent: UInt64 = 0

      var ifaddr: UnsafeMutablePointer<ifaddrs>?
      guard getifaddrs(&ifaddr) == 0, let firstAddr = ifaddr else {
        return [
          "bytesReceived": -1,
          "bytesSent": -1,
        ] as [String: Any]
      }

      defer { freeifaddrs(ifaddr) }

      var cursor = firstAddr
      while true {
        let addr = cursor.pointee

        // Only count AF_LINK (data link layer) interfaces
        if addr.ifa_addr?.pointee.sa_family == UInt8(AF_LINK) {
          if let data = addr.ifa_data {
            let networkData = data.assumingMemoryBound(to: if_data.self).pointee
            bytesReceived += UInt64(networkData.ifi_ibytes)
            bytesSent += UInt64(networkData.ifi_obytes)
          }
        }

        guard let next = addr.ifa_next else { break }
        cursor = next
      }

      return [
        "bytesReceived": bytesReceived,
        "bytesSent": bytesSent,
      ] as [String: Any]
    }

    // MARK: - Speed Test

    /// Download a file from a URL and measure throughput.
    /// Downloads the entire response (no Range header) for accurate measurement.
    /// Returns { downloadSpeedMbps, bytesDownloaded, durationMs }
    AsyncFunction("runSpeedTest") { (testUrl: String) async -> [String: Any] in
      guard let url = URL(string: testUrl) else {
        return [
          "downloadSpeedMbps": -1.0,
          "bytesDownloaded": 0,
          "durationMs": -1.0,
        ] as [String: Any]
      }

      var request = URLRequest(url: url)
      request.httpMethod = "GET"
      request.timeoutInterval = 15.0
      request.cachePolicy = .reloadIgnoringLocalCacheData

      let startTime = CFAbsoluteTimeGetCurrent()

      do {
        let (data, _) = try await URLSession.shared.data(for: request)
        let endTime = CFAbsoluteTimeGetCurrent()
        let durationMs = (endTime - startTime) * 1000.0
        let bytesDownloaded = data.count

        var speedMbps = -1.0
        if bytesDownloaded > 0 && durationMs > 0 {
          speedMbps = (Double(bytesDownloaded) * 8.0) / (durationMs * 1000.0)
          speedMbps = round(speedMbps * 100) / 100
        }

        return [
          "downloadSpeedMbps": speedMbps,
          "bytesDownloaded": bytesDownloaded,
          "durationMs": round(durationMs * 10) / 10,
        ] as [String: Any]
      } catch {
        NSLog("[DeviceHealth] Speed test failed: \(error.localizedDescription)")
        return [
          "downloadSpeedMbps": -1.0,
          "bytesDownloaded": 0,
          "durationMs": -1.0,
        ] as [String: Any]
      }
    }

    /// Reset stored snapshot (call when monitoring session ends)
    Function("resetCPUSnapshot") {
      self.hasPreviousSnapshot = false
      self.prevUserTicks = 0
      self.prevSystemTicks = 0
      self.prevIdleTicks = 0
      self.prevNiceTicks = 0
    }
  }

  // MARK: - Mach Kernel API

  private func hostCPULoadInfo() throws -> host_cpu_load_info {
    let HOST_CPU_LOAD_INFO_COUNT =
      MemoryLayout<host_cpu_load_info>.stride / MemoryLayout<integer_t>.stride

    var size = mach_msg_type_number_t(HOST_CPU_LOAD_INFO_COUNT)
    var cpuLoadInfo = host_cpu_load_info()

    let result = withUnsafeMutablePointer(to: &cpuLoadInfo) {
      $0.withMemoryRebound(to: integer_t.self, capacity: HOST_CPU_LOAD_INFO_COUNT) {
        host_statistics(mach_host_self(), HOST_CPU_LOAD_INFO, $0, &size)
      }
    }

    guard result == KERN_SUCCESS else {
      throw NSError(
        domain: "DeviceHealth",
        code: Int(result),
        userInfo: [NSLocalizedDescriptionKey: "Failed to read CPU load info from Mach kernel"]
      )
    }

    return cpuLoadInfo
  }
}
