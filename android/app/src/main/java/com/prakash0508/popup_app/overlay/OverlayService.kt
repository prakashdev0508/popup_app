package com.prakash0508.popup_app.overlay

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.*
import androidx.core.app.NotificationCompat
import com.prakash0508.popup_app.MainActivity
import com.prakash0508.popup_app.R
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.abs

class OverlayService : Service() {
  private lateinit var windowManager: WindowManager
  private var bubbleView: View? = null
  private var sheetRootView: View? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
    startAsForeground()
    maybeShowBubble()
  }

  override fun onDestroy() {
    super.onDestroy()
    removeAllOverlays()
  }

  private fun startAsForeground() {
    val channelId = "overlay_channel"
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val mgr = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
      val channel = NotificationChannel(
        channelId,
        "Overlay",
        NotificationManager.IMPORTANCE_LOW
      )
      mgr.createNotificationChannel(channel)
    }

    val openAppIntent = Intent(this, MainActivity::class.java)
    val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    } else {
      PendingIntent.FLAG_UPDATE_CURRENT
    }
    val pending = PendingIntent.getActivity(this, 0, openAppIntent, pendingFlags)

    val notification = NotificationCompat.Builder(this, channelId)
      .setContentTitle("Popup assistant is running")
      .setContentText("Tap the bubble to pick and copy a saved item.")
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentIntent(pending)
      .setOngoing(true)
      .build()

    startForeground(1001, notification)
  }

  private fun canDrawOverlays(): Boolean {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) Settings.canDrawOverlays(this) else true
  }

  private fun maybeShowBubble() {
    if (!canDrawOverlays()) return
    if (bubbleView != null) return

    val bubble = FrameLayout(this).apply {
      val size = dp(56)
      layoutParams = FrameLayout.LayoutParams(size, size)
      setBackgroundColor(Color.TRANSPARENT)
    }

    val circle = FrameLayout(this).apply {
      setBackgroundColor(Color.parseColor("#1E88E5"))
      val pad = dp(10)
      setPadding(pad, pad, pad, pad)
      elevation = dp(6).toFloat()
    }
    val icon = ImageView(this).apply {
      setImageResource(android.R.drawable.ic_input_add)
      setColorFilter(Color.WHITE)
    }
    circle.addView(icon, FrameLayout.LayoutParams(dp(24), dp(24), Gravity.CENTER))
    bubble.addView(circle, FrameLayout.LayoutParams(dp(56), dp(56), Gravity.CENTER))

    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.WRAP_CONTENT,
      WindowManager.LayoutParams.WRAP_CONTENT,
      overlayWindowType(),
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
      PixelFormat.TRANSLUCENT
    ).apply {
      gravity = Gravity.TOP or Gravity.END
      x = dp(16)
      y = dp(180)
    }

    attachDragAndClick(bubble, params)
    windowManager.addView(bubble, params)
    bubbleView = bubble
  }

  private fun attachDragAndClick(bubble: View, params: WindowManager.LayoutParams) {
    var initialX = 0
    var initialY = 0
    var initialTouchX = 0f
    var initialTouchY = 0f
    var downTime = 0L

    bubble.setOnTouchListener { _, event ->
      when (event.action) {
        MotionEvent.ACTION_DOWN -> {
          downTime = System.currentTimeMillis()
          initialX = params.x
          initialY = params.y
          initialTouchX = event.rawX
          initialTouchY = event.rawY
          true
        }
        MotionEvent.ACTION_MOVE -> {
          val dx = (initialTouchX - event.rawX).toInt()
          val dy = (event.rawY - initialTouchY).toInt()
          params.x = initialX + dx
          params.y = initialY + dy
          safeUpdateViewLayout(bubble, params)
          true
        }
        MotionEvent.ACTION_UP -> {
          val elapsed = System.currentTimeMillis() - downTime
          val moved = abs(event.rawX - initialTouchX) + abs(event.rawY - initialTouchY) > dp(6)
          if (elapsed < 250 && !moved) toggleSheet()
          true
        }
        else -> false
      }
    }
  }

  private fun toggleSheet() {
    // Instead of a native picker, trigger the React Native bottom-sheet UI via deep link.
    openReactNativePicker()
  }

  private fun openReactNativePicker() {
    try {
      val intent = Intent(
        Intent.ACTION_VIEW,
        android.net.Uri.parse("popupapp://overlay-picker")
      ).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        // Keep a single task and reuse MainActivity (it is singleTask).
        addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
      }
      startActivity(intent)
    } catch (_: Exception) {
      // As a fallback, keep using the native sheet (older behavior).
      showSheet()
    }
  }

  private fun showSheet() {
    if (!canDrawOverlays()) return
    if (sheetRootView != null) return

    val root = FrameLayout(this).apply {
      setBackgroundColor(Color.parseColor("#66000000"))
    }

    val card = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setBackgroundColor(Color.WHITE)
      elevation = dp(10).toFloat()
      setPadding(dp(16), dp(14), dp(16), dp(16))
    }

    val headerRow = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
    }
    val title = TextView(this).apply {
      text = "Pick an item to copy"
      textSize = 16f
      setTextColor(Color.parseColor("#111111"))
    }
    val close = TextView(this).apply {
      text = "Close"
      textSize = 14f
      setTextColor(Color.parseColor("#1E88E5"))
      setPadding(dp(12), dp(8), dp(12), dp(8))
      setOnClickListener { removeSheet() }
    }
    val spacer = Space(this)
    headerRow.addView(title, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
    headerRow.addView(spacer, LinearLayout.LayoutParams(dp(8), 1))
    headerRow.addView(close)

    val listView = ListView(this).apply {
      dividerHeight = dp(1)
    }

    val items = loadItems()
    val display = items.map { it.display }.toTypedArray()
    listView.adapter = ArrayAdapter(this, android.R.layout.simple_list_item_1, display)

    listView.setOnItemClickListener { _, _, position, _ ->
      val item = items.getOrNull(position) ?: return@setOnItemClickListener
      copyToClipboard(item.label, item.value)
      Toast.makeText(this, "Copied: ${item.label}", Toast.LENGTH_SHORT).show()
      removeSheet()
    }

    if (items.isEmpty()) {
      val empty = TextView(this).apply {
        text = "No saved items yet.\nAdd items in the app, then tap the bubble again."
        setTextColor(Color.parseColor("#444444"))
        textSize = 14f
        setPadding(0, dp(12), 0, dp(12))
      }
      card.addView(headerRow)
      card.addView(empty)
    } else {
      card.addView(headerRow)
      card.addView(listView, LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        dp(360)
      ))
    }

    val cardParams = FrameLayout.LayoutParams(
      FrameLayout.LayoutParams.MATCH_PARENT,
      FrameLayout.LayoutParams.WRAP_CONTENT
    ).apply {
      gravity = Gravity.BOTTOM
      leftMargin = dp(12)
      rightMargin = dp(12)
      bottomMargin = dp(12)
    }
    root.addView(card, cardParams)

    root.setOnClickListener { removeSheet() }
    card.setOnClickListener { /* prevent closing when tapping inside */ }

    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.MATCH_PARENT,
      overlayWindowType(),
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
      PixelFormat.TRANSLUCENT
    ).apply {
      gravity = Gravity.TOP or Gravity.START
    }

    windowManager.addView(root, params)
    sheetRootView = root
  }

  private fun removeSheet() {
    sheetRootView?.let {
      try {
        windowManager.removeView(it)
      } catch (_: Exception) {}
    }
    sheetRootView = null
  }

  private fun removeAllOverlays() {
    removeSheet()
    bubbleView?.let {
      try {
        windowManager.removeView(it)
      } catch (_: Exception) {}
    }
    bubbleView = null
  }

  private fun safeUpdateViewLayout(view: View, params: WindowManager.LayoutParams) {
    try {
      windowManager.updateViewLayout(view, params)
    } catch (_: Exception) {}
  }

  private fun overlayWindowType(): Int {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    } else {
      @Suppress("DEPRECATION")
      WindowManager.LayoutParams.TYPE_PHONE
    }
  }

  private fun prefs() =
    getSharedPreferences(OverlayStorage.PREFS_NAME, MODE_PRIVATE)

  private data class OverlayItem(val label: String, val value: String) {
    val display: String
      get() = if (value.isBlank()) label else "$label: $value"
  }

  private fun loadItems(): List<OverlayItem> {
    val raw = prefs().getString(OverlayStorage.KEY_ITEMS_JSON, "[]") ?: "[]"
    return try {
      val arr = JSONArray(raw)
      val list = ArrayList<OverlayItem>(arr.length())
      for (i in 0 until arr.length()) {
        val obj = arr.optJSONObject(i) ?: JSONObject()
        val label = obj.optString("label", "").trim()
        val value = obj.optString("value", "").trim()
        if (label.isNotBlank() || value.isNotBlank()) {
          list.add(OverlayItem(label.ifBlank { "Item ${i + 1}" }, value))
        }
      }
      list
    } catch (_: Exception) {
      emptyList()
    }
  }

  private fun copyToClipboard(label: String, value: String) {
    val clipboard = getSystemService(CLIPBOARD_SERVICE) as ClipboardManager
    clipboard.setPrimaryClip(ClipData.newPlainText(label, value))
  }

  private fun dp(value: Int): Int {
    return (value * resources.displayMetrics.density).toInt()
  }
}

