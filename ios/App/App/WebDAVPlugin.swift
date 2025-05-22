import Foundation
import Capacitor

@objc(WebDAVPlugin)
public class WebDAVPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WebDAVPlugin"
    public let jsName = "WebDAV"
    
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "createFolder", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkFolderExists", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "listContents", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "uploadFile", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteFolder", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getFile", returnType: CAPPluginReturnPromise)
    ]
    
    override public func load() {}

    // MARK: - Custom Insecure Session

    private class InsecureURLSessionDelegate: NSObject, URLSessionDelegate {
        func urlSession(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge,
                        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
            if let serverTrust = challenge.protectionSpace.serverTrust {
                completionHandler(.useCredential, URLCredential(trust: serverTrust))
            } else {
                completionHandler(.performDefaultHandling, nil)
            }
        }
    }

    private func createInsecureSession() -> URLSession {
        let config = URLSessionConfiguration.default
        return URLSession(configuration: config, delegate: InsecureURLSessionDelegate(), delegateQueue: nil)
    }

    // MARK: - Folder Operations

    @objc func createFolder(_ call: CAPPluginCall) {
        guard let url = call.getString("url"),
              let username = call.getString("username"),
              let password = call.getString("password"),
              let requestURL = URL(string: url) else {
            call.reject("Missing or invalid parameters")
            return
        }

        var request = URLRequest(url: requestURL)
        request.httpMethod = "MKCOL"
        request.addValue(getAuthHeader(username: username, password: password), forHTTPHeaderField: "Authorization")

        let task = createInsecureSession().dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    call.reject("Failed to create folder: \(error.localizedDescription)")
                    return
                }

                guard let httpResponse = response as? HTTPURLResponse else {
                    call.reject("Invalid response")
                    return
                }

                if (200...299).contains(httpResponse.statusCode) {
                    call.resolve(["message": "Folder created successfully."])
                } else {
                    call.reject("Failed to create folder: \(httpResponse.statusCode)")
                }
            }
        }

        task.resume()
    }

    @objc func checkFolderExists(_ call: CAPPluginCall) {
        guard let url = call.getString("url"),
              let username = call.getString("username"),
              let password = call.getString("password"),
              let requestURL = URL(string: url) else {
            call.reject("Missing or invalid parameters")
            return
        }

        var request = URLRequest(url: requestURL)
        request.httpMethod = "PROPFIND"
        request.addValue(getAuthHeader(username: username, password: password), forHTTPHeaderField: "Authorization")

        let task = createInsecureSession().dataTask(with: request) { _, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    call.reject("Failed to check folder existence: \(error.localizedDescription)")
                    return
                }

                guard let httpResponse = response as? HTTPURLResponse else {
                    call.reject("Invalid response")
                    return
                }

                if (200...299).contains(httpResponse.statusCode) {
                    call.resolve(["message": "Folder exists.", "exists": true])
                } else {
                    call.reject("Folder does not exist: \(httpResponse.statusCode)")
                }
            }
        }

        task.resume()
    }

    @objc func deleteFolder(_ call: CAPPluginCall) {
        guard let url = call.getString("url"),
              let username = call.getString("username"),
              let password = call.getString("password"),
              let requestURL = URL(string: url) else {
            call.reject("Missing or invalid parameters")
            return
        }

        var request = URLRequest(url: requestURL)
        request.httpMethod = "DELETE"
        request.addValue(getAuthHeader(username: username, password: password), forHTTPHeaderField: "Authorization")

        let task = createInsecureSession().dataTask(with: request) { _, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    call.reject("Delete failed: \(error.localizedDescription)")
                    return
                }

                guard let httpResponse = response as? HTTPURLResponse else {
                    call.reject("Invalid response")
                    return
                }

                if (200...299).contains(httpResponse.statusCode) {
                    call.resolve(["message": "Folder deleted"])
                } else {
                    call.reject("Delete failed with status: \(httpResponse.statusCode)")
                }
            }
        }

        task.resume()
    }

    // MARK: - File Operations

    @objc func uploadFile(_ call: CAPPluginCall) {
        guard let url = call.getString("url"),
              let username = call.getString("username"),
              let password = call.getString("password"),
              let base64Content = call.getString("content"),
              let data = Data(base64Encoded: base64Content),
              let requestURL = URL(string: url) else {
            call.reject("Missing or invalid parameters")
            return
        }

        var request = URLRequest(url: requestURL)
        request.httpMethod = "PUT"
        request.addValue(getAuthHeader(username: username, password: password), forHTTPHeaderField: "Authorization")
        request.httpBody = data

        let task = createInsecureSession().dataTask(with: request) { _, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    call.reject("Upload failed: \(error.localizedDescription)")
                    return
                }

                guard let httpResponse = response as? HTTPURLResponse else {
                    call.reject("Invalid response")
                    return
                }

                if (200...299).contains(httpResponse.statusCode) {
                    call.resolve(["message": "File uploaded"])
                } else {
                    call.reject("Upload failed with status: \(httpResponse.statusCode)")
                }
            }
        }

        task.resume()
    }

    @objc func getFile(_ call: CAPPluginCall) {
        guard let url = call.getString("url"),
              let username = call.getString("username"),
              let password = call.getString("password"),
              let requestURL = URL(string: url) else {
            call.reject("Missing or invalid parameters")
            return
        }

        var request = URLRequest(url: requestURL)
        request.httpMethod = "GET"
        request.addValue(getAuthHeader(username: username, password: password), forHTTPHeaderField: "Authorization")

        let task = createInsecureSession().dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    call.reject("GET failed: \(error.localizedDescription)")
                    return
                }

                guard let httpResponse = response as? HTTPURLResponse,
                      let data = data else {
                    call.reject("Invalid response")
                    return
                }

                if (200...299).contains(httpResponse.statusCode) {
                    let base64Data = data.base64EncodedString()
                    call.resolve(["content": base64Data])
                } else {
                    call.reject("GET failed with status: \(httpResponse.statusCode)")
                }
            }
        }

        task.resume()
    }

    @objc func listContents(_ call: CAPPluginCall) {
        guard let url = call.getString("url"),
              let username = call.getString("username"),
              let password = call.getString("password"),
              let requestURL = URL(string: url) else {
            call.reject("Missing or invalid parameters")
            return
        }

        var request = URLRequest(url: requestURL)
        request.httpMethod = "PROPFIND"
        request.addValue(getAuthHeader(username: username, password: password), forHTTPHeaderField: "Authorization")

        let task = createInsecureSession().dataTask(with: request) { data, response, error in
            if let error = error {
                DispatchQueue.main.async {
                    call.reject("Failed to list folder contents: \(error.localizedDescription)")
                }
                return
            }

            guard let httpResponse = response as? HTTPURLResponse else {
                DispatchQueue.main.async {
                    call.reject("Invalid response")
                }
                return
            }

            if (200...299).contains(httpResponse.statusCode) {
                DispatchQueue.main.async {
                    let xmlResponse = data != nil ? String(data: data!, encoding: .utf8) ?? "No response body" : "No response body"
                    call.resolve([
                        "message": "Folder exists.",
                        "data": xmlResponse
                    ])
                }
            } else {
                DispatchQueue.main.async {
                    let responseString = data != nil ? String(data: data!, encoding: .utf8) ?? "No response body" : "No response body"
                    call.reject("Failed to list folder contents: \(httpResponse.statusCode) - \(responseString)")
                }
            }
        }

        task.resume()
    }

    // MARK: - Auth Helper

    private func getAuthHeader(username: String, password: String) -> String {
        let credentialData = "\(username):\(password)".data(using: .utf8)!
        let base64Credentials = credentialData.base64EncodedString()
        return "Basic \(base64Credentials)"
    }
}
