package beaver.notes.pocket;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import android.util.Base64;
import android.util.Log;

import java.io.IOException;
import java.security.KeyStore;
import java.security.cert.Certificate;
import java.security.cert.CertificateFactory;
import java.util.concurrent.TimeUnit;

import javax.net.ssl.*;

import okhttp3.*;

@CapacitorPlugin(name = "WebDAV")
public class WebDAVPlugin extends Plugin {

    private OkHttpClient client;
    private boolean useInsecure = false;
    private SSLSocketFactory sslSocketFactory;
    private X509TrustManager trustManager;

    @Override
    public void load() {
        rebuildClient();
    }

    // Rebuild OkHttpClient depending on secure/insecure mode
    private void rebuildClient() {
        try {
            if (useInsecure) {
                TrustManager[] trustAllCerts = new TrustManager[] {
                        new X509TrustManager() {
                            public void checkClientTrusted(java.security.cert.X509Certificate[] chain, String authType) {}
                            public void checkServerTrusted(java.security.cert.X509Certificate[] chain, String authType) {}
                            public java.security.cert.X509Certificate[] getAcceptedIssuers() { return new java.security.cert.X509Certificate[]{}; }
                        }
                };

                SSLContext sslContext = SSLContext.getInstance("SSL");
                sslContext.init(null, trustAllCerts, new java.security.SecureRandom());
                sslSocketFactory = sslContext.getSocketFactory();

                trustManager = (X509TrustManager) trustAllCerts[0];

                client = new OkHttpClient.Builder()
                        .sslSocketFactory(sslSocketFactory, trustManager)
                        .hostnameVerifier((hostname, session) -> true)
                        .connectTimeout(30, TimeUnit.SECONDS)
                        .readTimeout(30, TimeUnit.SECONDS)
                        .build();
            } else if (sslSocketFactory != null && trustManager != null) {
                // Custom cert uploaded (sslSocketFactory & trustManager set)
                client = new OkHttpClient.Builder()
                        .sslSocketFactory(sslSocketFactory, trustManager)
                        .hostnameVerifier((hostname, session) -> true)
                        .connectTimeout(30, TimeUnit.SECONDS)
                        .readTimeout(30, TimeUnit.SECONDS)
                        .build();
            } else {
                // Default OkHttpClient
                client = new OkHttpClient.Builder()
                        .connectTimeout(30, TimeUnit.SECONDS)
                        .readTimeout(30, TimeUnit.SECONDS)
                        .build();
            }
        } catch (Exception e) {
            Log.e("WebDAVPlugin", "Error rebuilding client: " + e.getMessage());
            client = new OkHttpClient();
        }
    }

    private String getAuthHeader(String username, String password) {
        String credential = username + ":" + password;
        return "Basic " + Base64.encodeToString(credential.getBytes(), Base64.NO_WRAP);
    }

    @PluginMethod
    public void setInsecureMode(PluginCall call) {
        Boolean insecure = call.getBoolean("insecure");
        if (insecure == null) {
            call.reject("Missing 'insecure' parameter");
            return;
        }
        this.useInsecure = insecure;
        rebuildClient();
        JSObject ret = new JSObject();
        ret.put("message", "Insecure mode set to " + useInsecure);
        call.resolve(ret);
    }

    @PluginMethod
    public void uploadCertificate(PluginCall call) {
        String base64Cert = call.getString("certificate");
        if (base64Cert == null) {
            call.reject("Missing 'certificate' parameter");
            return;
        }
        try {
            byte[] certBytes = Base64.decode(base64Cert, Base64.DEFAULT);
            CertificateFactory cf = CertificateFactory.getInstance("X.509");
            Certificate cert = cf.generateCertificate(new java.io.ByteArrayInputStream(certBytes));

            KeyStore ks = KeyStore.getInstance(KeyStore.getDefaultType());
            ks.load(null);
            ks.setCertificateEntry("ca", cert);

            TrustManagerFactory tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
            tmf.init(ks);

            TrustManager[] trustManagers = tmf.getTrustManagers();
            if (trustManagers.length != 1 || !(trustManagers[0] instanceof X509TrustManager)) {
                call.reject("Unexpected default trust managers");
                return;
            }

            trustManager = (X509TrustManager) trustManagers[0];

            SSLContext sslContext = SSLContext.getInstance("TLS");
            sslContext.init(null, new TrustManager[]{trustManager}, null);
            sslSocketFactory = sslContext.getSocketFactory();

            rebuildClient();

            JSObject ret = new JSObject();
            ret.put("message", "Certificate uploaded successfully");
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Invalid certificate data: " + e.getMessage());
        }
    }

    @PluginMethod
    public void createFolder(PluginCall call) {
        String url = call.getString("url");
        String username = call.getString("username");
        String password = call.getString("password");

        if (url == null || username == null || password == null) {
            call.reject("Missing parameters");
            return;
        }

        Request request = new Request.Builder()
                .url(url)
                .addHeader("Authorization", getAuthHeader(username, password))
                .method("MKCOL", null)
                .build();

        client.newCall(request).enqueue(new okhttp3.Callback() {
            @Override
            public void onFailure(Call callInner, IOException e) {
                call.reject("Failed to create folder: " + e.getMessage(), e);
            }

            @Override
            public void onResponse(Call callInner, Response response) throws IOException {
                if (response.isSuccessful()) {
                    JSObject result = new JSObject();
                    result.put("message", "Folder created successfully.");
                    call.resolve(result);
                } else {
                    String body = response.body() != null ? response.body().string() : "No response body";
                    call.reject("Failed to create folder: " + response.code() + " - " + body);
                }
            }
        });
    }

    @PluginMethod
    public void checkFolderExists(PluginCall call) {
        String url = call.getString("url");
        String username = call.getString("username");
        String password = call.getString("password");

        if (url == null || username == null || password == null) {
            call.reject("Missing parameters");
            return;
        }

        Request request = new Request.Builder()
                .url(url)
                .addHeader("Authorization", getAuthHeader(username, password))
                .method("PROPFIND", null)
                .build();

        client.newCall(request).enqueue(new okhttp3.Callback() {
            @Override
            public void onFailure(Call callInner, IOException e) {
                call.reject("Failed to check folder existence: " + e.getMessage(), e);
            }

            @Override
            public void onResponse(Call callInner, Response response) throws IOException {
                if (response.isSuccessful()) {
                    JSObject result = new JSObject();
                    result.put("message", "Folder exists.");
                    result.put("exists", true);
                    call.resolve(result);
                } else {
                    String body = response.body() != null ? response.body().string() : "No response body";
                    call.reject("Folder does not exist: " + response.code() + " - " + body);
                }
            }
        });
    }

    @PluginMethod
    public void listContents(PluginCall call) {
        String url = call.getString("url");
        String username = call.getString("username");
        String password = call.getString("password");

        if (url == null || username == null || password == null) {
            call.reject("Missing parameters");
            return;
        }

        Request request = new Request.Builder()
                .url(url)
                .addHeader("Authorization", getAuthHeader(username, password))
                .method("PROPFIND", null)
                .build();

        client.newCall(request).enqueue(new okhttp3.Callback() {
            @Override
            public void onFailure(Call callInner, IOException e) {
                call.reject("Failed to list folder contents: " + e.getMessage(), e);
            }

            @Override
            public void onResponse(Call callInner, Response response) throws IOException {
                if (response.isSuccessful()) {
                    String xmlResponse = response.body() != null ? response.body().string() : "No response body";
                    JSObject result = new JSObject();
                    result.put("message", "Folder contents retrieved.");
                    result.put("data", xmlResponse);
                    call.resolve(result);
                } else {
                    String body = response.body() != null ? response.body().string() : "No response body";
                    call.reject("Failed to list folder contents: " + response.code() + " - " + body);
                }
            }
        });
    }

    @PluginMethod
    public void uploadFile(PluginCall call) {
        String url = call.getString("url");
        String username = call.getString("username");
        String password = call.getString("password");
        String base64Content = call.getString("content");

        if (url == null || username == null || password == null || base64Content == null) {
            call.reject("Missing parameters");
            return;
        }

        byte[] data = Base64.decode(base64Content, Base64.DEFAULT);

        RequestBody requestBody = RequestBody.create(data);

        Request request = new Request.Builder()
                .url(url)
                .addHeader("Authorization", getAuthHeader(username, password))
                .put(requestBody)
                .build();

        client.newCall(request).enqueue(new okhttp3.Callback() {
            @Override
            public void onFailure(Call callInner, IOException e) {
                call.reject("Upload failed: " + e.getMessage(), e);
            }

            @Override
            public void onResponse(Call callInner, Response response) throws IOException {
                if (response.isSuccessful()) {
                    JSObject result = new JSObject();
                    result.put("message", "File uploaded");
                    call.resolve(result);
                } else {
                    String body = response.body() != null ? response.body().string() : "No response body";
                    call.reject("Upload failed with status: " + response.code() + " - " + body);
                }
            }
        });
    }

    @PluginMethod
    public void deleteFolder(PluginCall call) {
        String url = call.getString("url");
        String username = call.getString("username");
        String password = call.getString("password");

        if (url == null || username == null || password == null) {
            call.reject("Missing parameters");
            return;
        }

        Request request = new Request.Builder()
                .url(url)
                .addHeader("Authorization", getAuthHeader(username, password))
                .delete()
                .build();

        client.newCall(request).enqueue(new okhttp3.Callback() {
            @Override
            public void onFailure(Call callInner, IOException e) {
                call.reject("Delete failed: " + e.getMessage(), e);
            }

            @Override
            public void onResponse(Call callInner, Response response) throws IOException {
                if (response.isSuccessful()) {
                    JSObject result = new JSObject();
                    result.put("message", "Folder deleted");
                    call.resolve(result);
                } else {
                    String body = response.body() != null ? response.body().string() : "No response body";
                    call.reject("Delete failed with status: " + response.code() + " - " + body);
                }
            }
        });
    }

    @PluginMethod
    public void getFile(PluginCall call) {
        String url = call.getString("url");
        String username = call.getString("username");
        String password = call.getString("password");

        if (url == null || username == null || password == null) {
            call.reject("Missing parameters");
            return;
        }

        Request request = new Request.Builder()
                .url(url)
                .addHeader("Authorization", getAuthHeader(username, password))
                .get()
                .build();

        client.newCall(request).enqueue(new okhttp3.Callback() {
            @Override
            public void onFailure(Call callInner, IOException e) {
                call.reject("GET failed: " + e.getMessage(), e);
            }

            @Override
            public void onResponse(Call callInner, Response response) throws IOException {
                if (response.isSuccessful()) {
                    byte[] bytes = response.body() != null ? response.body().bytes() : null;
                    if (bytes != null) {
                        String base64Data = Base64.encodeToString(bytes, Base64.NO_WRAP);
                        JSObject result = new JSObject();
                        result.put("content", base64Data);
                        call.resolve(result);
                    } else {
                        call.reject("Empty response body");
                    }
                } else {
                    String body = response.body() != null ? response.body().string() : "No response body";
                    call.reject("GET failed with status: " + response.code() + " - " + body);
                }
            }
        });
    }
}
