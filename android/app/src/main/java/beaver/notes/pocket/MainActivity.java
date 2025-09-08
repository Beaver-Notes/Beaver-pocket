package beaver.notes.pocket;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import android.content.pm.ActivityInfo;
import android.content.Intent;

import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;
import nl.recognize.msauthplugin.MsAuthPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(GoogleAuth.class);
        registerPlugin(MsAuthPlugin.class);
        registerPlugin(WebDAVPlugin.class);
        super.onCreate(savedInstanceState);

        if (getResources().getBoolean(R.bool.portrait_only)) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        }
    }
}
