package beaver.notes.pocket;

import android.os.Build;
import androidx.annotation.RequiresApi;
import com.getcapacitor.JSArray;
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

    private OkHttpClient client = new OkHttpClient();

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
                    pluginCall.resolve();
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
                    pluginCall.resolve();
                } else {
                    String responseBody = response.body() != null ? response.body().string() : "No response body";
                    Log.e("WebDAVPlugin", "Error checking folder: " + responseBody);
                    pluginCall.reject("Folder does not exist: " + response.message());
                }
            }
        });
    }

    @PluginMethod
    public void deleteFolder(PluginCall pluginCall) {
        String url = pluginCall.getString("url");
        String username = pluginCall.getString("username");
        String password = pluginCall.getString("password");

        Request request = new Request.Builder()
                .url(url)
                .addHeader("Authorization", getAuthHeader(username, password))
                .delete()
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                pluginCall.reject("Failed to delete folder: " + e.getMessage(), e);
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful()) {
                    pluginCall.resolve();
                } else {
                    String responseBody = response.body() != null ? response.body().string() : "No response body";
                    Log.e("WebDAVPlugin", "Error deleting folder: " + responseBody);
                    pluginCall.reject("Failed to delete folder: " + response.message());
                }
            }
        });
    }

    @RequiresApi(api = Build.VERSION_CODES.TIRAMISU)
    @PluginMethod
    public void uploadFile(PluginCall pluginCall) {
        String url = pluginCall.getString("url");
        String username = pluginCall.getString("username");
        String password = pluginCall.getString("password");
        String fileName = pluginCall.getString("fileName");
        String base64Content = pluginCall.getString("content"); // Base64 encoded content

        try {
            // Decode the base64 content into binary
            byte[] fileData = Base64.decode(base64Content.split(",")[1], Base64.DEFAULT); // Remove Data URL prefix
            File file = new File(getContext().getCacheDir(), fileName);

            // Write the binary data to a file
            try (FileOutputStream fos = new FileOutputStream(file)) {
                fos.write(fileData);
            }

            // Now upload the binary file as before
            RequestBody requestBody = RequestBody.create(file, MediaType.parse("application/octet-stream"));

            Request request = new Request.Builder()
                    .url(url)
                    .addHeader("Authorization", getAuthHeader(username, password))
                    .put(requestBody)
                    .build();

            client.newCall(request).enqueue(new Callback() {
                @Override
                public void onFailure(Call call, IOException e) {
                    pluginCall.reject("Failed to upload file: " + e.getMessage(), e);
                }

                @Override
                public void onResponse(Call call, Response response) throws IOException {
                    if (response.isSuccessful()) {
                        pluginCall.resolve();
                    } else {
                        String responseBody = response.body() != null ? response.body().string() : "No response body";
                        Log.e("WebDAVPlugin", "Error uploading file: " + responseBody);
                        pluginCall.reject("Failed to upload file: " + response.message());
                    }
                }
            });
        } catch (IOException e) {
            pluginCall.reject("Failed to write file content: " + e.getMessage(), e);
        }
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
                    // Implement parsing logic for the response body
                    JSArray contents = new JSArray();
                    // Add parsed contents to JSArray
                    JSObject result = new JSObject();
                    result.put("contents", contents);
                    pluginCall.resolve(result);
                } else {
                    String responseBody = response.body() != null ? response.body().string() : "No response body";
                    Log.e("WebDAVPlugin", "Error listing contents: " + responseBody);
                    pluginCall.reject("Failed to list folder contents: " + response.message());
                }
            }
        });
    }

    @PluginMethod
    public void downloadFile(PluginCall pluginCall) {
        String url = pluginCall.getString("url");
        String username = pluginCall.getString("username");
        String password = pluginCall.getString("password");
        String destinationPath = pluginCall.getString("destinationPath");

        Request request = new Request.Builder()
                .url(url)
                .addHeader("Authorization", getAuthHeader(username, password))
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                pluginCall.reject("Failed to download file: " + e.getMessage(), e);
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful()) {
                    try (InputStream inputStream = response.body().byteStream();
                         FileOutputStream outputStream = new FileOutputStream(new File(destinationPath))) {
                        byte[] buffer = new byte[1024];
                        int bytesRead;
                        while ((bytesRead = inputStream.read(buffer)) != -1) {
                            outputStream.write(buffer, 0, bytesRead);
                        }
                        pluginCall.resolve();
                    }
                } else {
                    String responseBody = response.body() != null ? response.body().string() : "No response body";
                    Log.e("WebDAVPlugin", "Error downloading file: " + responseBody);
                    pluginCall.reject("Failed to download file: " + response.message());
                }
            }
        });
    }

    @PluginMethod
    public void getFileContent(PluginCall pluginCall) {
        String url = pluginCall.getString("url");
        String username = pluginCall.getString("username");
        String password = pluginCall.getString("password");

        Request request = new Request.Builder()
                .url(url)
                .addHeader("Authorization", getAuthHeader(username, password))
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                pluginCall.reject("Failed to get file content: " + e.getMessage(), e);
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful()) {
                    String fileContent = response.body().string();
                    JSObject result = new JSObject();
                    result.put("fileContent", fileContent);
                    pluginCall.resolve(result);
                } else {
                    String responseBody = response.body() != null ? response.body().string() : "No response body";
                    Log.e("WebDAVPlugin", "Error getting file content: " + responseBody);
                    pluginCall.reject("Failed to get file content: " + response.message());
                }
            }
        });
    }
}
