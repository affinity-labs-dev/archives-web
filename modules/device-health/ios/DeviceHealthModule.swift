import ExpoModulesCore
import Darwin
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
