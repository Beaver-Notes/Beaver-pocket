package com.wmjalak.cordova.fileopener;

import java.io.IOException;
import java.net.URLConnection;

import android.content.ActivityNotFoundException;
import org.apache.cordova.CallbackContext;
import org.json.JSONArray;
import org.json.JSONException;

import android.content.Intent;
import android.net.Uri;

import org.apache.cordova.CordovaPlugin;

public class FileOpener extends CordovaPlugin {

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {

        try {
            if (action.equals("openFile")) {
                openFile(args.getString(0));
                callbackContext.success();
                return true;
            }
        } catch (IOException e) {
            e.printStackTrace();
            callbackContext.error(e.getMessage());
        } catch (RuntimeException e) {
            e.printStackTrace();
            callbackContext.error(e.getMessage());
        }
        return false;
    }

    private void openFile(String url) throws IOException {
        // Create URI
        Uri uri = Uri.parse(url);

        Intent intent;

        if(url.contains(".apk")) {
            // Application package file
            intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        } else {
            // Other file types
            String mimeType = URLConnection.guessContentTypeFromName(url);
            intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, mimeType);
        }

        Intent intentChooser = Intent.createChooser(intent, "Open File");
        try {
            this.cordova.getActivity().startActivity(intentChooser);
        } catch (ActivityNotFoundException e) {

        }
    }

}
