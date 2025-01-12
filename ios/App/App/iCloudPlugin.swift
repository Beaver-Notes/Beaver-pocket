import Capacitor
import Foundation

@objc(iCloudPlugin)
public class iCloudPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "iCloudPlugin"
    public let jsName = "iCloud"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "createFolder", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkFolderExists", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteFolder", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "uploadFile", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "listContents", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "downloadFile", returnType: CAPPluginReturnPromise)
    ]

    private let fileManager = FileManager.default
    private let containerIdentifier = "iCloud.beaver.notes.pocket"

    private var ubiquityURL: URL? {
        return fileManager.url(forUbiquityContainerIdentifier: containerIdentifier)?.appendingPathComponent("Documents")
    }

    override public func load() {
        super.load()
        NotificationCenter.default.addObserver(self, selector: #selector(iCloudAccountAvailabilityChanged(_:)), name: NSNotification.Name.NSUbiquityIdentityDidChange, object: nil)
    }

    @objc private func iCloudAccountAvailabilityChanged(_ notification: Notification) {
        // Handle iCloud account changes if necessary
        if fileManager.ubiquityIdentityToken == nil {
            print("iCloud account has been logged out or is unavailable")
            // Handle the case where iCloud is unavailable
        } else {
            print("iCloud account is available")
        }
    }

    @objc func createFolder(_ call: CAPPluginCall) {
        guard let folderName = call.getString("folderName") else {
            call.reject("Folder name missing")
            return
        }
        guard let url = ubiquityURL?.appendingPathComponent(folderName) else {
            call.reject("iCloud URL is nil")
            return
        }

        do {
            if !fileManager.fileExists(atPath: url.path) {
                try fileManager.createDirectory(at: url, withIntermediateDirectories: true, attributes: nil)
                print("Creating folder at: \(url)")
            } else {
                print("Folder already exists at: \(url)")
            }
            call.resolve(["success": true])
        } catch {
            print("Error creating folder: \(error.localizedDescription)")
            call.reject("Failed to create folder: \(error.localizedDescription)")
        }
    }

    @objc func uploadFile(_ call: CAPPluginCall) {
        guard let fileName = call.getString("fileName"), let fileData = call.getString("fileData") else {
            call.reject("File name or data missing")
            return
        }
        guard let url = ubiquityURL?.appendingPathComponent(fileName) else {
            call.reject("iCloud URL is nil")
            return
        }

        do {
            guard let data = Data(base64Encoded: fileData) else {
                call.reject("Invalid base64 data")
                return
            }
            print("Uploading file to: \(url)")
            try data.write(to: url)
            call.resolve(["success": true])
        } catch {
            print("Error uploading file: \(error.localizedDescription)")
            call.reject("Failed to upload file: \(error.localizedDescription)")
        }
    }

    @objc func checkFolderExists(_ call: CAPPluginCall) {
        guard let folderName = call.getString("folderName") else {
            call.reject("Folder name missing")
            return
        }
        guard let url = ubiquityURL?.appendingPathComponent(folderName) else {
            call.reject("iCloud URL is nil")
            return
        }

        let exists = fileManager.fileExists(atPath: url.path)
        print("Folder exists at: \(url): \(exists)")
        call.resolve(["exists": exists])
    }

    @objc func deleteFolder(_ call: CAPPluginCall) {
        guard let folderName = call.getString("folderName") else {
            call.reject("Folder name missing")
            return
        }
        guard let url = ubiquityURL?.appendingPathComponent(folderName) else {
            call.reject("iCloud URL is nil")
            return
        }

        do {
            print("Deleting folder at: \(url)")
            try fileManager.removeItem(at: url)
            call.resolve(["success": true])
        } catch {
            print("Error deleting folder: \(error.localizedDescription)")
            call.reject("Failed to delete folder: \(error.localizedDescription)")
        }
    }

    @objc func listContents(_ call: CAPPluginCall) {
        guard let folderName = call.getString("folderName") else {
            call.reject("Folder name missing")
            return
        }
        guard let url = ubiquityURL?.appendingPathComponent(folderName) else {
            call.reject("iCloud URL is nil")
            return
        }

        do {
            let contents = try fileManager.contentsOfDirectory(at: url, includingPropertiesForKeys: [.isDirectoryKey])
            
            // Map over the contents to create an array of dictionaries with file name and type
            let files = contents.map { url -> [String: Any] in
                let isDirectory = (try? url.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) ?? false
                return ["name": url.lastPathComponent, "type": isDirectory ? "directory" : "file"]
            }
            
            print("Contents of folder at \(url): \(files)")
            call.resolve(["files": files])
        } catch {
            print("Error listing contents: \(error.localizedDescription)")
            call.reject("Failed to list contents: \(error.localizedDescription)")
        }
    }

    @objc func downloadFile(_ call: CAPPluginCall) {
        guard let fileName = call.getString("fileName") else {
            call.reject("File name missing")
            return
        }
        guard let url = ubiquityURL?.appendingPathComponent(fileName) else {
            call.reject("iCloud URL is nil")
            return
        }

        do {
            let data = try Data(contentsOf: url)
            let base64Data = data.base64EncodedString()
            print("Downloaded file from: \(url)")
            call.resolve(["fileData": base64Data])
        } catch {
            print("Error downloading file: \(error.localizedDescription)")
            call.reject("Failed to download file: \(error.localizedDescription)")
        }
    }

    private func forceSync(url: URL) {
        do {
            try fileManager.setUbiquitous(true, itemAt: url, destinationURL: url)
            print("File synchronized with iCloud: \(url)")
        } catch {
            print("Error forcing sync: \(error.localizedDescription)")
        }
    }
}
