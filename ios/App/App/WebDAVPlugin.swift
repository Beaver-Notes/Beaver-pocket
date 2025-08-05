import Foundation
import Capacitor

@objc(WebDAVPlugin)
public class WebDAVPlugin: CAPPlugin, CAPBridgedPlugin {
     
     public override init() {
         super.init()
     }
     
     public let identifier = "WebDAVPlugin"
     public let jsName = "WebDAV"
     
     public let pluginMethods: [CAPPluginMethod] = [
          CAPPluginMethod(name: "setInsecureMode", returnType: CAPPluginReturnPromise),
          CAPPluginMethod(name: "uploadCertificate", returnType: CAPPluginReturnPromise),
          CAPPluginMethod(name: "createFolder", returnType: CAPPluginReturnPromise),
          CAPPluginMethod(name: "checkFolderExists", returnType: CAPPluginReturnPromise),
          CAPPluginMethod(name: "listContents", returnType: CAPPluginReturnPromise),
          CAPPluginMethod(name: "uploadFile", returnType: CAPPluginReturnPromise),
          CAPPluginMethod(name: "deleteFolder", returnType: CAPPluginReturnPromise),
          CAPPluginMethod(name: "getFile", returnType: CAPPluginReturnPromise)
     ]
     
     private var useInsecure: Bool = false
     private var trustedCertificate: SecCertificate?
     
     override public func load() {}
     
     @objc func setInsecureMode(_ call: CAPPluginCall) {
          useInsecure = call.getBool("insecure") ?? false
          call.resolve(["message": "Insecure mode set to \(useInsecure)"])
     }
     
     @objc func uploadCertificate(_ call: CAPPluginCall) {
          guard let base64Cert = call.getString("certificate"),
                let certData = Data(base64Encoded: base64Cert),
                let certificate = SecCertificateCreateWithData(nil, certData as CFData) else {
               call.reject("Invalid certificate data")
               return
          }
          
          self.trustedCertificate = certificate
          call.resolve(["message": "Certificate uploaded successfully"])
     }
     
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
     
     private class CustomCertSessionDelegate: NSObject, URLSessionDelegate {
          let trustedCert: SecCertificate?
          
          init(cert: SecCertificate?) {
               self.trustedCert = cert
          }
          
          func urlSession(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge,
                          completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
               guard let serverTrust = challenge.protectionSpace.serverTrust,
                     let trustedCert = trustedCert else {
                    completionHandler(.performDefaultHandling, nil)
                    return
               }
               
               let certCount = SecTrustGetCertificateCount(serverTrust)
               if certCount > 0,
                  let serverCertificate = SecTrustGetCertificateAtIndex(serverTrust, 0) {
                    let serverCertData = SecCertificateCopyData(serverCertificate) as Data
                    let localCertData = SecCertificateCopyData(trustedCert) as Data
                    
                    if serverCertData == localCertData {
                         completionHandler(.useCredential, URLCredential(trust: serverTrust))
                         return
                    }
               }
               
               completionHandler(.cancelAuthenticationChallenge, nil)
          }
     }
     
     private func getSession() -> URLSession {
          if useInsecure {
               let config = URLSessionConfiguration.default
               return URLSession(configuration: config, delegate: InsecureURLSessionDelegate(), delegateQueue: nil)
          } else if let cert = trustedCertificate {
               let config = URLSessionConfiguration.default
               return URLSession(configuration: config, delegate: CustomCertSessionDelegate(cert: cert), delegateQueue: nil)
          } else {
               return URLSession.shared
          }
     }
     
     private func getAuthHeader(username: String, password: String) -> String {
          let credentialData = "\(username):\(password)".data(using: .utf8)!
          let base64Credentials = credentialData.base64EncodedString()
          return "Basic \(base64Credentials)"
     }
     
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
          
          let task = getSession().dataTask(with: request) { _, response, error in
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
          
          let task = getSession().dataTask(with: request) { _, response, error in
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
          
          let task = getSession().dataTask(with: request) { _, response, error in
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
          
          let task = getSession().dataTask(with: request) { _, response, error in
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
          
          let task = getSession().dataTask(with: request) { data, response, error in
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
          
          // THIS IS THE KEY FIX - Add Depth header to get folder contents
          request.addValue("1", forHTTPHeaderField: "Depth")
          
          // Optional: Add Content-Type header
          request.addValue("application/xml", forHTTPHeaderField: "Content-Type")
          
          // Optional: Add a basic PROPFIND body to request specific properties
          let propfindBody = """
         <?xml version="1.0" encoding="utf-8" ?>
         <D:propfind xmlns:D="DAV:">
             <D:prop>
                 <D:resourcetype/>
                 <D:getcontentlength/>
                 <D:getlastmodified/>
                 <D:creationdate/>
             </D:prop>
         </D:propfind>
         """
          
          request.httpBody = propfindBody.data(using: .utf8)
          
          let task = getSession().dataTask(with: request) { data, response, error in
               DispatchQueue.main.async {
                    if let error = error {
                         call.reject("Failed to list folder contents: \(error.localizedDescription)")
                         return
                    }
                    
                    guard let httpResponse = response as? HTTPURLResponse else {
                         call.reject("Invalid response")
                         return
                    }
                    
                    if (200...299).contains(httpResponse.statusCode) {
                         let xmlResponse = data != nil ? String(data: data!, encoding: .utf8) ?? "No response body" : "No response body"
                         call.resolve([
                              "message": "Folder contents retrieved.",
                              "data": xmlResponse
                         ])
                    } else {
                         let responseString = data != nil ? String(data: data!, encoding: .utf8) ?? "No response body" : "No response body"
                         call.reject("Failed to list folder contents: \(httpResponse.statusCode) - \(responseString)")
                    }
               }
          }
          task.resume()
     }
}
