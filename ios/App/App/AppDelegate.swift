import UIKit
import Capacitor
import SendIntent
import RecognizebvCapacitorPluginMsauth

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    
    let store = ShareStore.store
    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        (window?.rootViewController as? CAPBridgeViewController)?.bridge?.webView?.allowsBackForwardNavigationGestures = false
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can ocx1cur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.¡
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and stor  e enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a URL.
        // If you want the App API to support tracking app URL opens, keep the MsAuthPlugin call.
        if MsAuthPlugin.checkAppOpen(url: url, options: options) == true {
            return true
        }
        
        var success = true
        
        // Handle CAPBridge URL handling.
        if CAPBridge.handleOpenUrl(url, options) {
            success = ApplicationDelegateProxy.shared.application(app, open: url, options: options)
        }
        
        // Parse URL components.
        guard let components = NSURLComponents(url: url, resolvingAgainstBaseURL: true),
              let params = components.queryItems else {
            return false
        }
        
        // Extract query parameters.
        let titles = params.filter { $0.name == "title" }
        let descriptions = params.filter { $0.name == "description" }
        let types = params.filter { $0.name == "type" }
        let urls = params.filter { $0.name == "url" }
        
        // Clear the store and populate with new share items.
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
        
        // Process the intent and post a notification.
        store.processed = false
        NotificationCenter.default.post(name: Notification.Name("triggerSendIntent"), object: nil)
        
        // Return the overall success status.
        return success
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
