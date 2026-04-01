import UserNotifications

class NotificationService: UNNotificationServiceExtension {
  var contentHandler: ((UNNotificationContent) -> Void)?
  var bestAttemptContent: UNMutableNotificationContent?
  var originalContent: UNNotificationContent?

  override func didReceive(
    _ request: UNNotificationRequest,
    withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
  ) {
    self.contentHandler = contentHandler
    self.originalContent = request.content
    bestAttemptContent =
      (request.content.mutableCopy() as? UNMutableNotificationContent)

    guard let bestAttemptContent = bestAttemptContent else {
      contentHandler(request.content)
      return
    }

    if let userInfo = request.content.userInfo["body"] as? [String: Any],
      let richContent = userInfo["_richContent"] as? [String: Any],
      let imageUrlString = richContent["image"] as? String,
      let imageUrl = URL(string: imageUrlString) {
      downloadAndAttachImage(url: imageUrl, to: bestAttemptContent) { content in
        contentHandler(content)
      }
    } else {
      contentHandler(bestAttemptContent)
    }
  }

  private func downloadAndAttachImage(
    url: URL,
    to content: UNMutableNotificationContent,
    completion: @escaping (UNNotificationContent) -> Void
  ) {
    let task = URLSession.shared.downloadTask(with: url) { temporaryFileLocation, _, error in
      guard let temporaryFileLocation = temporaryFileLocation else {
        completion(content)
        return
      }

      let fileManager = FileManager.default
      let tempDirectory = URL(fileURLWithPath: NSTemporaryDirectory())
      let ext = url.pathExtension.isEmpty ? "jpg" : url.pathExtension
      let targetFileName = temporaryFileLocation.lastPathComponent + ".\(ext)"
      let targetUrl = tempDirectory.appendingPathComponent(targetFileName)

      try? fileManager.removeItem(at: targetUrl)

      do {
        try fileManager.moveItem(at: temporaryFileLocation, to: targetUrl)

        let attachment = try UNNotificationAttachment(
          identifier: "image",
          url: targetUrl,
          options: nil
        )

        content.attachments = [attachment]
      } catch {
        print("Error processing attachment: \(error.localizedDescription)")
      }

      completion(content)
    }

    task.resume()
  }

  override func serviceExtensionTimeWillExpire() {
    if let contentHandler = contentHandler {
      contentHandler(bestAttemptContent ?? originalContent ?? UNNotificationContent())
    }
  }
}