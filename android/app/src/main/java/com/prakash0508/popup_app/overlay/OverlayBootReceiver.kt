package com.prakash0508.popup_app.overlay

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat

class OverlayBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    // Only restore if the user previously enabled it.
    val prefs = context.getSharedPreferences(OverlayStorage.PREFS_NAME, Context.MODE_PRIVATE)
    val enabled = prefs.getBoolean(OverlayStorage.KEY_OVERLAY_ENABLED, false)
    if (!enabled) return

    val canDraw = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      Settings.canDrawOverlays(context)
    } else {
      true
    }
    if (!canDraw) return

    if (Build.VERSION.SDK_INT >= 33) {
      val granted = context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
      if (!granted) return
    }

    val svc = Intent(context, OverlayService::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      ContextCompat.startForegroundService(context, svc)
    } else {
      context.startService(svc)
    }
  }
}

