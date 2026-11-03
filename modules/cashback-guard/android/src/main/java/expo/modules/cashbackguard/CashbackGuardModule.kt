package expo.modules.cashbackguard

import android.app.AppOpsManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Process
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray

/**
 * JS bridge for the cashback guard. Exposes:
 *   - permission status + deep links to the two system settings screens
 *     (Usage access + Notifications — Android won't let us grant these silently;
 *     the app routes the user there and re-checks on return),
 *   - start/stop of the foreground detection service, and
 *   - setMerchants(): persists the per-merchant tracked URL + rate label that
 *     the reminder notification opens when the user taps it.
 *
 * Why setMerchants exists: the real tracked URL is CashKaro's per-store
 * `cashback_url` with the logged-in user's id injected — it's dynamic and only
 * the JS layer (with the session + offers API) can build it. JS computes it and
 * hands it down here; the service reads it back from SharedPreferences at tap
 * time so it keeps working with the RN app closed.
 */
class CashbackGuardModule : Module() {

  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context is not available" }

  private fun prefs() =
    context.getSharedPreferences(CashbackGuardService.PREFS, Context.MODE_PRIVATE)

  override fun definition() = ModuleDefinition {
    Name("CashbackGuard")

    // "Usage access" (PACKAGE_USAGE_STATS) — lets us read which app is in the
    // foreground. It's an AppOps permission, not a runtime one, so we check it
    // via AppOpsManager rather than checkSelfPermission.
    Function("isUsageAccessGranted") {
      isUsageAccessGranted()
    }

    // Whether the user has notifications enabled for the app (needed to deliver
    // the reminder). On Android 13+ this is the POST_NOTIFICATIONS runtime
    // permission; below that it's the per-app notification toggle.
    Function("areNotificationsEnabled") {
      (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
        .areNotificationsEnabled()
    }

    Function("openUsageAccessSettings") {
      val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    // Open this app's notification settings so the user can enable them.
    Function("openNotificationSettings") {
      val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
        .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    // Start the foreground detection service. No-op'd safely by the OS if both
    // permissions aren't granted (the service just won't be able to read usage
    // or draw — but JS should gate on isFullyEnabled before calling this).
    Function("startGuard") {
      val intent = Intent(context, CashbackGuardService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    Function("stopGuard") {
      context.stopService(Intent(context, CashbackGuardService::class.java))
    }

    // Accepts a JSON array string of
    //   [{ "packageName": "...", "url": "...", "label": "..." }, ...]
    // and stores url_<package> / label_<package> for the service to read.
    Function("setMerchants") { json: String ->
      val arr = JSONArray(json)
      val editor = prefs().edit()
      for (i in 0 until arr.length()) {
        val o = arr.getJSONObject(i)
        val pkg = o.optString("packageName")
        if (pkg.isEmpty()) continue
        o.optString("url").takeIf { it.isNotEmpty() }?.let { editor.putString("url_$pkg", it) }
        o.optString("label").takeIf { it.isNotEmpty() }?.let { editor.putString("label_$pkg", it) }
      }
      editor.apply()
    }
  }

  private fun isUsageAccessGranted(): Boolean {
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      appOps.unsafeCheckOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName
      )
    } else {
      @Suppress("DEPRECATION")
      appOps.checkOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName
      )
    }
    return mode == AppOpsManager.MODE_ALLOWED
  }
}
