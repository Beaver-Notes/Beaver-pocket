import UIKit
import Capacitor
import SendIntent
import CoreSpotlight
import RecognizebvCapacitorPluginMsauth

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
     
     let store = ShareStore.store
     var window: UIWindow?
     
     func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
          
          (window?.rootViewController as? CAPBridgeViewController)?.bridge?.webView?.allowsBackForwardNavigationGestures = false
          return true
     }
     
     func applicationWillResignActive(_ application: UIApplication) {
          
          
     }
     
     func applicationDidEnterBackground(_ application: UIApplication) {
          
          
     }
     
     func applicationWillEnterForeground(_ application: UIApplication) {
          
     }
     
     func applicationDidBecomeActive(_ application: UIApplication) {
          
     }
     
     func applicationWillTerminate(_ application: UIApplication) {
          
     }
     
     func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
          
          
          if MsAuthPlugin.checkAppOpen(url: url, options: options) == true {
               return true
          }
          
          var success = true
          
          
          if CAPBridge.handleOpenUrl(url, options) {
               success = ApplicationDelegateProxy.shared.application(app, open: url, options: options)
          }
          
          
          guard let components = NSURLComponents(url: url, resolvingAgainstBaseURL: true),
                let params = components.queryItems else {
               return false
          }
          
          
          let titles = params.filter { $0.name == "title" }
          let descriptions = params.filter { $0.name == "description" }
          let types = params.filter { $0.name == "type" }
          let urls = params.filter { $0.name == "url" }
          
          
          store.shareItems.removeAll()
          
          if !titles.isEmpty {
               for index in 0..<titles.count {
                    var shareItem: JSObject = JSObject()
                    shareItem["title"] = titles[index].value ?? ""
                    shareItem["description"] = descriptions[index].value ?? ""
                    shareItem["type"] = types[index].value ?? ""
                    shareItem["url"] = urls[index].value ?? ""
                    store.shareItems.append(shareItem)
               }
          }
          
          
          store.processed = false
          NotificationCenter.default.post(name: Notification.Name("triggerSendIntent"), object: nil)
          
          
          return success
     }
     
     func application(_ application: UIApplication,
                    continue userActivity: NSUserActivity,
                    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
     if userActivity.activityType == CSSearchableItemActionType,
          let id = userActivity.userInfo?[CSSearchableItemActivityIdentifier] as? String {

          // Store in the same place Capacitor Preferences reads from
          UserDefaults.standard.set(id, forKey: "CapacitorStorage.pendingSpotSearchId")

          DispatchQueue.main.async {
               (self.window?.rootViewController as? CAPBridgeViewController)?
                    .bridge?
                    .triggerJSEvent(
                         eventName: "spotsearchOpen",
                         target: "window",
                         data: #"{"id":"\#(id)"}"#
                    )
          }
          return true
     }

     return ApplicationDelegateProxy.shared.application(
          application,
          continue: userActivity,
          restorationHandler: restorationHandler
     )
     }
}
