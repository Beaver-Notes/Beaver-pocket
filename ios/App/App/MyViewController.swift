import UIKit
import Capacitor

class MyViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        webView!.allowsBackForwardNavigationGestures = true
    }
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(iCloudPlugin())
    }
}
