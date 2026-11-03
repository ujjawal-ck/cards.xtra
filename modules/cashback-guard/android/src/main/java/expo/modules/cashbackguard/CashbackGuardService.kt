package expo.modules.cashbackguard

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.app.KeyguardManager

/**
 * "Never Miss Cashback" — foreground service.
 *
 * Detects when a partner shopping app comes to the foreground (via
 * UsageStatsManager) and fires a one-tap "Activate cashback" PUSH NOTIFICATION.
 * Tapping it opens the user-attributed CashKaro tracked link so the order is
 * credited. (Earlier versions drew an overlay bubble; that needed
 * SYSTEM_ALERT_WINDOW and was riskier for Play review — a notification needs no
 * overlay permission and works even when the partner app is full-screen.)
 *
 * Why this design:
 *   - UsageStatsManager is Play-Store-acceptable for app-usage features, where
 *     an AccessibilityService used for non-accessibility purposes is not.
 *   - UsageStatsManager has NO callback, so we POLL queryEvents on a timer.
 *     Polling costs battery, so we ONLY poll while the screen is on AND
 *     unlocked — a SCREEN_OFF / locked device stops the loop entirely.
 *   - A foreground service (with a low-importance ongoing notification) keeps
 *     the loop alive when the RN app is closed.
 *
 * WhatsApp (future): the same detection point can additionally ping a backend
 * that sends a WhatsApp message — see notifyReminder(). Push ships now; the
 * WhatsApp send is server-side and added later.
 */
class CashbackGuardService : Service() {

  data class Merchant(val name: String, val rate: String, val fallbackUrl: String)

  companion object {
    // Keys are the exact (case-sensitive) Android package names. Amazon India
    // is in.amazon.mShop.android.shopping — note the capital S in "mShop"; a
    // lowercase "mshop" never matches and Amazon goes undetected.
    private val MERCHANTS: Map<String, Merchant> = mapOf(
      "in.amazon.mShop.android.shopping" to Merchant(
        name = "Amazon", rate = "Cashback", fallbackUrl = "https://cashkaro.com/stores/amazon"
      ),
      "com.flipkart.android" to Merchant(
        name = "Flipkart", rate = "Cashback", fallbackUrl = "https://cashkaro.com/stores/flipkart"
      ),
      "com.ril.ajio" to Merchant(
        name = "AJIO", rate = "Cashback", fallbackUrl = "https://cashkaro.com/stores/ajio"
      )
    )

    /** SharedPreferences file shared with CashbackGuardModule.setMerchants. */
    const val PREFS = "cashback_guard_prefs"

    private const val CHANNEL_FGS = "cashback_guard_service"
    private const val CHANNEL_REMINDER = "cashback_guard_reminder"
    private const val NOTIF_FGS_ID = 4711
    // Reminder notifications are id'd per-merchant (pkg.hashCode) so re-firing
    // for the same store replaces the old one instead of stacking.

    // How often we sample the foreground app while the screen is on.
    private const val POLL_INTERVAL_MS = 1_500L
    private const val POLL_WINDOW_MS = 10_000L

    // After we remind for a store, stay quiet for this long — even on re-open.
    private const val COOLDOWN_MS = 15 * 60 * 1000L

    private const val SAFFRON = 0xFFFF6D1D.toInt()
  }

  private var usage: UsageStatsManager? = null
  private var power: PowerManager? = null
  private var keyguard: KeyguardManager? = null
  private var notifications: NotificationManager? = null

  private val handler = Handler(Looper.getMainLooper())

  private var polling = false
  private var currentForeground: String? = null
  private val cooldownUntil = HashMap<String, Long>()

  // Pause polling when the screen turns off / locks; resume when on + unlocked.
  // This keeps the feature off the battery budget at rest.
  private val screenReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      when (intent?.action) {
        Intent.ACTION_SCREEN_OFF -> stopPolling()
        Intent.ACTION_SCREEN_ON, Intent.ACTION_USER_PRESENT -> maybeStartPolling()
      }
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    usage = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    power = getSystemService(Context.POWER_SERVICE) as PowerManager
    keyguard = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
    notifications = getSystemService(NotificationManager::class.java)

    createChannels()
    startForegroundNotification()

    val filter = IntentFilter().apply {
      addAction(Intent.ACTION_SCREEN_ON)
      addAction(Intent.ACTION_SCREEN_OFF)
      addAction(Intent.ACTION_USER_PRESENT)
    }
    registerReceiver(screenReceiver, filter)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    maybeStartPolling()
    return START_STICKY
  }

  override fun onDestroy() {
    super.onDestroy()
    stopPolling()
    try {
      unregisterReceiver(screenReceiver)
    } catch (_: Exception) {
      // not registered
    }
  }

  // -------------------------------------------------------------------------
  // Polling loop — only alive while screen on + unlocked.
  // -------------------------------------------------------------------------
  private fun screenInteractive(): Boolean {
    val on = power?.isInteractive ?: false
    val locked = keyguard?.isKeyguardLocked ?: false
    return on && !locked
  }

  private fun maybeStartPolling() {
    if (polling || !screenInteractive()) return
    polling = true
    handler.post(pollTick)
  }

  private fun stopPolling() {
    polling = false
    handler.removeCallbacks(pollTick)
  }

  private val pollTick = object : Runnable {
    override fun run() {
      if (!polling) return
      if (!screenInteractive()) {
        stopPolling()
        return
      }
      sampleForeground()
      handler.postDelayed(this, POLL_INTERVAL_MS)
    }
  }

  /** Read the most recent foreground package and react to a transition. */
  private fun sampleForeground() {
    val now = System.currentTimeMillis()
    val events = usage?.queryEvents(now - POLL_WINDOW_MS, now) ?: return

    var latestPkg: String? = null
    val e = UsageEvents.Event()
    while (events.hasNextEvent()) {
      events.getNextEvent(e)
      @Suppress("DEPRECATION")
      if (e.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND) {
        latestPkg = e.packageName
      }
    }

    if (latestPkg == null || latestPkg == currentForeground) return
    onForegroundChanged(latestPkg)
  }

  private fun onForegroundChanged(pkg: String) {
    currentForeground = pkg
    if (pkg == packageName) return            // our own app — never nag
    val merchant = MERCHANTS[pkg] ?: return    // not a partner app

    val now = android.os.SystemClock.elapsedRealtime()
    if ((cooldownUntil[pkg] ?: 0L) > now) return // recently reminded — stay quiet
    cooldownUntil[pkg] = now + COOLDOWN_MS

    notifyReminder(pkg, merchant)
  }

  // -------------------------------------------------------------------------
  // The reminder — a heads-up push notification (replaces the old overlay).
  // -------------------------------------------------------------------------
  private fun notifyReminder(pkg: String, merchant: Merchant) {
    val url = resolveUrl(pkg, merchant)
    val tapIntent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    val pending = PendingIntent.getActivity(
      this,
      pkg.hashCode(),
      tapIntent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )

    val notification = Notification.Builder(this, CHANNEL_REMINDER)
      .setContentTitle("Activate cashback on ${merchant.name}")
      .setContentText("Tap to track this order via Cards.xtra and earn ${merchant.name} cashback.")
      .setSmallIcon(applicationInfo.icon)
      .setColor(SAFFRON)
      .setAutoCancel(true)
      .setContentIntent(pending)
      .build()

    // POST_NOTIFICATIONS (Android 13+) must be granted or this no-ops silently.
    try {
      notifications?.notify(pkg.hashCode(), notification)
    } catch (_: Exception) {
      // notifications disabled — nothing to do
    }

    // WhatsApp (future): also fire a backend ping here to send a WhatsApp
    // message for this merchant + user. Server-side; push covers it for now.
  }

  // -------------------------------------------------------------------------
  // Per-merchant config pushed from JS (CashbackGuardModule.setMerchants).
  // Falls back to the static store page when no sync has run yet.
  // -------------------------------------------------------------------------
  private fun prefs() = getSharedPreferences(PREFS, MODE_PRIVATE)

  private fun resolveUrl(pkg: String, merchant: Merchant): String =
    prefs().getString("url_$pkg", null)?.takeIf { it.isNotBlank() } ?: merchant.fallbackUrl

  // -------------------------------------------------------------------------
  // Notification channels + the required foreground-service notification.
  // -------------------------------------------------------------------------
  private fun createChannels() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val mgr = notifications ?: return
    mgr.createNotificationChannel(
      NotificationChannel(
        CHANNEL_FGS,
        "Never Miss Cashback (running)",
        NotificationManager.IMPORTANCE_LOW // quiet, ongoing status entry
      ).apply { description = "Keeps cashback reminders ready while you shop." }
    )
    mgr.createNotificationChannel(
      NotificationChannel(
        CHANNEL_REMINDER,
        "Cashback reminders",
        NotificationManager.IMPORTANCE_HIGH // heads-up when you open a store
      ).apply { description = "Reminds you to activate cashback at partner stores." }
    )
  }

  private fun startForegroundNotification() {
    val launch = packageManager.getLaunchIntentForPackage(packageName)
    val pending = if (launch != null) {
      PendingIntent.getActivity(
        this, 0, launch,
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
      )
    } else null

    val notification: Notification = Notification.Builder(this, CHANNEL_FGS)
      .setContentTitle("Never Miss Cashback is on")
      .setContentText("We’ll remind you to activate cashback at partner stores.")
      .setSmallIcon(applicationInfo.icon)
      .setColor(SAFFRON)
      .setOngoing(true)
      .also { if (pending != null) it.setContentIntent(pending) }
      .build()

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(NOTIF_FGS_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(NOTIF_FGS_ID, notification)
    }
  }
}
