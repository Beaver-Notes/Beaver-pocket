import React, { useEffect, useState } from "react";
import { Browser } from "@capacitor/browser";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";

const CLIENT_ID = import.meta.env.VITE_ONEDRIVE_CLIENT_ID;
const REDIRECT_URI = "http://localhost:5173/onedrive";
const SCOPES = "offline_access files.readwrite";

const OneDriveSync: React.FC = () => {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [authorizationCode, setAuthorizationCode] = useState<string>("");
    const [browserClosed, setBrowserClosed] = useState<boolean>(false);

        const retrieveAccessToken = async () => {
            try {
                const storedAccessToken = (await SecureStoragePlugin.get({
                    key: "onedrive_access_token",
                })).value;
                if (storedAccessToken) {
                    setAccessToken(storedAccessToken);
                }
            } catch (error) {
                console.error("Error retrieving access token:", error);
            }
        };
        
    useEffect(() => {
        const handleBrowserFinished = () => {
            retrieveAccessToken();
            setBrowserClosed(true);
        };

        async function addBrowserListener() {
            const browserFinishedListener = await Browser.addListener('browserFinished', handleBrowserFinished);
            return browserFinishedListener;
        }

        const removeBrowserListener = addBrowserListener();

        return () => {
            removeBrowserListener.then(listener => listener.remove());
        };
    }, []);

    useEffect(() => {
        if (browserClosed && authorizationCode) {
            // Run your code to exchange authorization code for access token
            handleExchange();
        }
    }, [browserClosed, authorizationCode]);

    const handleLogin = async () => {
        await Browser.open({
            url: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${CLIENT_ID}&scope=${SCOPES}&response_type=code&redirect_uri=${REDIRECT_URI}`,
        });
    };

    const handleExchange = async () => {
        try {
            // Log the authorization code before exchanging
            console.log("Authorization Code:", authorizationCode);

            const requestBody = new URLSearchParams({
                client_id: CLIENT_ID,
                scope: SCOPES,
                code: authorizationCode,
                redirect_uri: REDIRECT_URI,
                grant_type: "authorization_code",
            }).toString();

            const response = await fetch(
                "https://login.microsoftonline.com/common/oauth2/v2.0/token",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: requestBody,
                }
            );

            if (response.ok) {
                const data = await response.json();
                const accessToken = data.access_token;

                // Save access token securely
                await SecureStoragePlugin.set({
                    key: "onedrive_access_token",
                    value: accessToken,
                });
                setAccessToken(accessToken);
            } else {
                console.error("Failed to exchange authorization code for token");
            }
        } catch (error) {
            console.error("Error exchanging authorization code for token:", error);
        }
    };

    const logout = async () => {
        // Remove the access token from storage
        await SecureStoragePlugin.remove({ key: "onedrive_access_token" });
        setAccessToken(null);
    };

    return (
        <div>
            {accessToken ? (
                <div>
                    <p>Logged in to OneDrive</p>
                    <button onClick={logout}>Logout</button>
                </div>
            ) : (
                <div>
                    <p>Not logged in to OneDrive</p>
                    <button onClick={handleLogin}>Login</button>
                    <input
                        type="text"
                        value={authorizationCode}
                        onChange={(e) => setAuthorizationCode(e.target.value)}
                        placeholder="Paste authorization code here"
                    />
                    <button onClick={handleExchange}>Exchange Code</button>
                </div>
            )}
        </div>
    );
};

export default OneDriveSync;
