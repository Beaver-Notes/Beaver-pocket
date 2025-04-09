import Foundation
import Capacitor

@objc(WebDAVPlugin)
public class WebDAVPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WebDAVPlugin"
    public let jsName = "WebDAV"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "createFolder", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkFolderExists", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "listContents", returnType: CAPPluginReturnPromise)
    ]
    
    @objc func createFolder(_ call: CAPPluginCall) {
        guard let url = call.getString("url"),
              let username = call.getString("username"),
              let password = call.getString("password") else {
            call.reject("Missing required parameters")
            return
        }
        
        guard let requestURL = URL(string: url) else {
            call.reject("Invalid URL")
            return
        }
        
        var request = URLRequest(url: requestURL)
        request.httpMethod = "MKCOL"
        request.addValue(getAuthHeader(username: username, password: password), forHTTPHeaderField: "Authorization")
        
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                DispatchQueue.main.async {
                    call.reject("Failed to create folder: \(error.localizedDescription)")
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
                    print("Folder created successfully.")
                    call.resolve(["message": "Folder created successfully."])
                }
            } else {
                DispatchQueue.main.async {
                    let responseString = data != nil ? String(data: data!, encoding: .utf8) ?? "No response body" : "No response body"
                    print("Error creating folder: \(responseString)")
                    call.reject("Failed to create folder: \(httpResponse.statusCode)")
                }
            }
        }
        
        task.resume()
    }
    
    @objc func checkFolderExists(_ call: CAPPluginCall) {
        guard let url = call.getString("url"),
              let username = call.getString("username"),
              let password = call.getString("password") else {
            call.reject("Missing required parameters")
            return
        }
        
        guard let requestURL = URL(string: url) else {
            call.reject("Invalid URL")
            return
        }
        
        var request = URLRequest(url: requestURL)
        request.httpMethod = "PROPFIND"
        request.addValue(getAuthHeader(username: username, password: password), forHTTPHeaderField: "Authorization")
        
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                DispatchQueue.main.async {
                    call.reject("Failed to check folder existence: \(error.localizedDescription)")
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
                    print("Folder exists.")
                    call.resolve(["message": "Folder exists.", "exists": true])
                }
            } else {
                DispatchQueue.main.async {
                    let responseString = data != nil ? String(data: data!, encoding: .utf8) ?? "No response body" : "No response body"
                    print("Error checking folder: \(responseString)")
                    call.reject("Folder does not exist: \(httpResponse.statusCode)")
                }
            }
        }
        
        task.resume()
    }
    
    @objc func listContents(_ call: CAPPluginCall) {
        guard let url = call.getString("url"),
              let username = call.getString("username"),
              let password = call.getString("password") else {
            call.reject("Missing required parameters")
            return
        }
        
        guard let requestURL = URL(string: url) else {
            call.reject("Invalid URL")
            return
        }
        
        var request = URLRequest(url: requestURL)
        request.httpMethod = "PROPFIND"
        request.addValue(getAuthHeader(username: username, password: password), forHTTPHeaderField: "Authorization")
        
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
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
                    print("Folder contents listed successfully.")
                    call.resolve([
                        "message": "Folder exists.",
                        "data": xmlResponse
                    ])
                }
            } else {
                DispatchQueue.main.async {
                    let responseString = data != nil ? String(data: data!, encoding: .utf8) ?? "No response body" : "No response body"
                    print("Error listing contents: \(responseString)")
                    call.reject("Failed to list folder contents: \(httpResponse.statusCode)")
                }
            }
        }
        
        task.resume()
    }
    
    private func getAuthHeader(username: String, password: String) -> String {
        let credentialData = "\(username):\(password)".data(using: .utf8)!
        let base64Credentials = credentialData.base64EncodedString()
        return "Basic \(base64Credentials)"
    }
    
    override public func load() {
        // Plugin initialization if needed
    }
}
