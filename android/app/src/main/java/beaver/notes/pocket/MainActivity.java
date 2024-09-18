package beaver.notes.pocket;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import android.content.pm.ActivityInfo;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(WebDAVPlugin.class);
        super.onCreate(savedInstanceState);
        if(getResources().getBoolean(R.bool.portrait_only)){
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        }
    }
}
