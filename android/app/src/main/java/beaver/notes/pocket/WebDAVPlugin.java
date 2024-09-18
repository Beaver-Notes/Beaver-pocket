package beaver.notes.pocket;

import android.os.Build;

import androidx.annotation.RequiresApi;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.thegrizzlylabs.sardineandroid.DavResource;
import com.thegrizzlylabs.sardineandroid.impl.OkHttpSardine;
import com.thegrizzlylabs.sardineandroid.Sardine;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.List;

@CapacitorPlugin(name = "WebDAV")
public class WebDAVPlugin extends Plugin {

    // Create Folder
    @PluginMethod
    public void createFolder(PluginCall call) {
        String url = call.getString("url");
        String username = call.getString("username");
        String password = call.getString("password");

        Sardine sardine = new OkHttpSardine();
        sardine.setCredentials(username, password);

        try {
            sardine.createDirectory(url);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to create folder", e);
        }
    }

    // Check if Folder Exists
    @PluginMethod
    public void checkFolderExists(PluginCall call) {
        String url = call.getString("url");
        String username = call.getString("username");
        String password = call.getString("password");

        Sardine sardine = new OkHttpSardine();
        sardine.setCredentials(username, password);

        try {
            List<DavResource> resources = sardine.list(url);
            if (!resources.isEmpty()) {
                call.resolve();
            } else {
                call.reject("Folder does not exist");
            }
        } catch (Exception e) {
            call.reject("Failed to check folder existence", e);
        }
    }

    // Delete Folder
    @PluginMethod
    public void deleteFolder(PluginCall call) {
        String url = call.getString("url");
        String username = call.getString("username");
        String password = call.getString("password");

        Sardine sardine = new OkHttpSardine();
        sardine.setCredentials(username, password);

        try {
            sardine.delete(url);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to delete folder", e);
        }
    }

    // Upload File
    @RequiresApi(api = Build.VERSION_CODES.TIRAMISU)
    @PluginMethod
    public void uploadFile(PluginCall call) {
        String url = call.getString("url");
        String username = call.getString("username");
        String password = call.getString("password");
        String filePath = call.getString("filePath");

        Sardine sardine = new OkHttpSardine();
        sardine.setCredentials(username, password);

        try {
            File file = new File(filePath);
            InputStream inputStream = new FileInputStream(file);

            // Convert InputStream to byte[]
            byte[] fileBytes = inputStream.readAllBytes();
            sardine.put(url, fileBytes);

            inputStream.close();
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to upload file", e);
        }
    }

    // List Folder Contents
    @PluginMethod
    public void listContents(PluginCall call) {
        String url = call.getString("url");
        String username = call.getString("username");
        String password = call.getString("password");

        Sardine sardine = new OkHttpSardine();
        sardine.setCredentials(username, password);

        try {
            List<DavResource> resources = sardine.list(url);
            JSArray contents = new JSArray();
            for (DavResource res : resources) {
                JSObject obj = new JSObject();
                obj.put("name", res.getName());
                obj.put("isDirectory", res.isDirectory());
                obj.put("contentLength", res.getContentLength());
                obj.put("lastModified", res.getModified());
                contents.put(obj);
            }
            JSObject result = new JSObject();
            result.put("contents", contents);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to list folder contents", e);
        }
    }

    // Download File
    @PluginMethod
    public void downloadFile(PluginCall call) {
        String url = call.getString("url");
        String username = call.getString("username");
        String password = call.getString("password");
        String destinationPath = call.getString("destinationPath");

        Sardine sardine = new OkHttpSardine();
        sardine.setCredentials(username, password);

        try {
            InputStream inputStream = sardine.get(url);
            File file = new File(destinationPath);
            FileOutputStream outputStream = new FileOutputStream(file);

            byte[] buffer = new byte[1024];
            int bytesRead;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, bytesRead);
            }

            outputStream.close();
            inputStream.close();
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to download file", e);
        }
    }

    // Get File Content
    @PluginMethod
    public void getFileContent(PluginCall call) {
        String url = call.getString("url");
        String username = call.getString("username");
        String password = call.getString("password");

        Sardine sardine = new OkHttpSardine();
        sardine.setCredentials(username, password);

        try {
            InputStream inputStream = sardine.get(url);
            ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();

            byte[] buffer = new byte[1024];
            int bytesRead;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                byteArrayOutputStream.write(buffer, 0, bytesRead);
            }

            String fileContent = byteArrayOutputStream.toString("UTF-8");

            JSObject result = new JSObject();
            result.put("fileContent", fileContent);

            inputStream.close();
            byteArrayOutputStream.close();

            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to get file content", e);
        }
    }
}
