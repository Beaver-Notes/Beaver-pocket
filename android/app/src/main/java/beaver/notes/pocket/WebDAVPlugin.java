package beaver.notes.pocket;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import android.util.Log;
import com.getcapacitor.PluginMethod;
import android.util.Base64;
import com.getcapacitor.annotation.CapacitorPlugin;
import okhttp3.*;

import java.io.*;

@CapacitorPlugin(name = "WebDAV")
public class WebDAVPlugin extends Plugin {

    private OkHttpClient client = new OkHttpClient.Builder()
            .hostnameVerifier((hostname, session) -> true) // Allow all hostnames
            .build();;

    private String getAuthHeader(String username, String password) {
        String credential = username + ":" + password;
        return "Basic " + Base64.encodeToString(credential.getBytes(), Base64.NO_WRAP);
    }

    @PluginMethod
    public void createFolder(PluginCall pluginCall) {
        String url = pluginCall.getString("url");
        String username = pluginCall.getString("username");
        String password = pluginCall.getString("password");

        Request request = new Request.Builder()
                .url(url)
                .addHeader("Authorization", getAuthHeader(username, password))
                .method("MKCOL", null)
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                pluginCall.reject("Failed to create folder: " + e.getMessage(), e);
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful()) {
                    Log.d("WebDAVPlugin", "Folder created successfully.");
                    JSObject result = new JSObject();
                    result.put("message", "Folder created successfully.");
                    pluginCall.resolve(result);
                } else {
                    String responseBody = response.body() != null ? response.body().string() : "No response body";
                    Log.e("WebDAVPlugin", "Error creating folder: " + responseBody);
                    pluginCall.reject("Failed to create folder: " + response.message());
                }
            }
        });
    }

    @PluginMethod
    public void checkFolderExists(PluginCall pluginCall) {
        String url = pluginCall.getString("url");
        String username = pluginCall.getString("username");
        String password = pluginCall.getString("password");

        Request request = new Request.Builder()
                .url(url)
                .addHeader("Authorization", getAuthHeader(username, password))
                .method("PROPFIND", null)
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                pluginCall.reject("Failed to check folder existence: " + e.getMessage(), e);
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful()) {
                    Log.d("WebDAVPlugin", "Folder exists.");
                    JSObject result = new JSObject();
                    result.put("message", "Folder exists.");
                    pluginCall.resolve(result);
                } else {
                    String responseBody = response.body() != null ? response.body().string() : "No response body";
                    Log.e("WebDAVPlugin", "Error checking folder: " + responseBody);
                    pluginCall.reject("Folder does not exist: " + response.message());
                }
            }
        });
    }

    @PluginMethod
    public void listContents(PluginCall pluginCall) {
        String url = pluginCall.getString("url");
        String username = pluginCall.getString("username");
        String password = pluginCall.getString("password");

        Request request = new Request.Builder()
                .url(url)
                .addHeader("Authorization", getAuthHeader(username, password))
                .method("PROPFIND", null)
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                pluginCall.reject("Failed to list folder contents: " + e.getMessage(), e);
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful()) {
                    // Read the response body as XML
                    String xmlResponse = response.body() != null ? response.body().string() : "No response body";

                    // Send XML response back to JS side
                    JSObject result = new JSObject();
                    result.put("message", "Folder exists.");
                    result.put("data", xmlResponse); // Ensure xmlResponse is a valid string
                    Log.d("WebDAVPlugin", "Resolving call with result: " + result.toString());
                    pluginCall.resolve(result);
                } else {
                    String responseBody = response.body() != null ? response.body().string() : "No response body";
                    Log.e("WebDAVPlugin", "Error listing contents: " + responseBody);
                    pluginCall.reject("Failed to list folder contents: " + response.message());
                }
            }
        });
    }
}