//
//  DynamicAppIconPlugin.swift
//  App
//
//  Created by Daniele Rolli on 12/6/24.
//
import Capacitor
import Foundation

@objc(DynamicAppIconPlugin)
public class DynamicAppIconPlugin: CAPPlugin {
    public let identifier = "DynamicAppIconPlugin"
    @objc func setAppIcon(_ call: CAPPluginCall) {
        let iconName = call.getString("iconName")
        
        if UIApplication.shared.supportsAlternateIcons {
            UIApplication.shared.setAlternateIconName(iconName) { error in
                if let error = error {
                    call.reject("Error setting icon: \(error.localizedDescription)")
                } else {
                    call.resolve([
                        "status": "success",
                        "iconName": iconName ?? "Default"
                    ])
                }
            }
        } else {
            call.reject("Alternate icons not supported on this device.")
        }
    }

    @objc func getCurrentAppIcon(_ call: CAPPluginCall) {
        let currentIcon = UIApplication.shared.alternateIconName ?? "Default"
        call.resolve([
            "currentIcon": currentIcon
        ])
    }
}

