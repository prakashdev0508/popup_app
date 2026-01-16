package com.prakash0508.popup_app.overlay

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import org.json.JSONArray

class OverlayModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "OverlayModule"

  private fun prefs() =
    reactContext.getSharedPreferences(OverlayStorage.PREFS_NAME, android.content.Context.MODE_PRIVATE)

  @ReactMethod
  fun checkOverlayPermission(promise: Promise) {
    val canDraw = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      Settings.canDrawOverlays(reactContext)
    } else {
      true
    }
    promise.resolve(canDraw)
  }

  @ReactMethod
  fun requestOverlayPermission() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return
    val intent = Intent(
      Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
      Uri.parse("package:${reactContext.packageName}")
    ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    reactContext.startActivity(intent)
  }

  @ReactMethod
  fun startOverlay(promise: Promise) {
    try {
      val intent = Intent(reactContext, OverlayService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        ContextCompat.startForegroundService(reactContext, intent)
      } else {
        reactContext.startService(intent)
      }
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("OVERLAY_START_FAILED", e)
    }
  }

  @ReactMethod
  fun stopOverlay(promise: Promise) {
    try {
      val intent = Intent(reactContext, OverlayService::class.java)
      reactContext.stopService(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("OVERLAY_STOP_FAILED", e)
    }
  }

  @ReactMethod
  fun getItems(promise: Promise) {
    try {
      val raw = prefs().getString(OverlayStorage.KEY_ITEMS_JSON, "[]") ?: "[]"
      // Validate JSON so the native overlay doesn't crash if corrupted.
      JSONArray(raw)
      promise.resolve(raw)
    } catch (e: Exception) {
      promise.resolve("[]")
    }
  }

  @ReactMethod
  fun setItems(itemsJson: String, promise: Promise) {
    try {
      // Validate JSON before persisting.
      JSONArray(itemsJson)
      prefs().edit().putString(OverlayStorage.KEY_ITEMS_JSON, itemsJson).apply()
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("ITEMS_INVALID_JSON", e)
    }
  }
}

