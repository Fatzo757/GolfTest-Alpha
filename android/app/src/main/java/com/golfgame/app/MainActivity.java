package com.golfgame.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.Window;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        supportRequestWindowFeature(Window.FEATURE_NO_TITLE);
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);

        // Hide the native ActionBar if it somehow appeared
        if (getSupportActionBar() != null) {
            getSupportActionBar().hide();
        }

        // Make the status bar transparent and draw under it
        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);
    }
}
