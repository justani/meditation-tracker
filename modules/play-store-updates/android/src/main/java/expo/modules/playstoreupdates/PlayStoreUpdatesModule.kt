package expo.modules.playstoreupdates

import android.app.Activity
import android.content.Context
import androidx.core.os.bundleOf
import com.google.android.play.core.appupdate.AppUpdateInfo
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.InstallStateUpdatedListener
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.InstallStatus
import com.google.android.play.core.install.model.UpdateAvailability
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PlayStoreUpdatesModule : Module() {
  private var updateManager: AppUpdateManager? = null
  private var installStateListener: InstallStateUpdatedListener? = null
  private var pendingUpdateInfo: AppUpdateInfo? = null

  override fun definition() = ModuleDefinition {
    Name("PlayStoreUpdates")

    Events(UPDATE_STATUS_EVENT)

    OnStartObserving(UPDATE_STATUS_EVENT) {
      registerInstallStateListener()
    }

    OnStopObserving(UPDATE_STATUS_EVENT) {
      unregisterInstallStateListener()
    }

    OnDestroy {
      unregisterInstallStateListener()
      pendingUpdateInfo = null
    }

    AsyncFunction("getUpdateInfoAsync") { promise: Promise ->
      manager().appUpdateInfo
        .addOnSuccessListener { info ->
          pendingUpdateInfo = info
          promise.resolve(info.toResult())
        }
        .addOnFailureListener { error ->
          pendingUpdateInfo = null
          promise.reject("ERR_PLAY_STORE_UPDATE_CHECK", error.message, error)
        }
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("startFlexibleUpdateAsync") { promise: Promise ->
      val manager = manager()
      val activity = appContext.throwingActivity
      val preparedInfo = pendingUpdateInfo
      pendingUpdateInfo = null

      if (preparedInfo != null) {
        startFlexibleUpdateIfAllowed(manager, activity, preparedInfo, promise)
      } else {
        manager.appUpdateInfo
          .addOnSuccessListener { info ->
            startFlexibleUpdateIfAllowed(manager, activity, info, promise)
          }
          .addOnFailureListener { error ->
            promise.reject("ERR_PLAY_STORE_UPDATE_CHECK", error.message, error)
          }
      }
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("completeUpdateAsync") { promise: Promise ->
      val manager = manager()
      manager.appUpdateInfo
        .addOnSuccessListener { info ->
          if (info.installStatus() != InstallStatus.DOWNLOADED) {
            promise.resolve(false)
            return@addOnSuccessListener
          }

          manager.completeUpdate()
            .addOnSuccessListener { promise.resolve(true) }
            .addOnFailureListener { error ->
              promise.reject("ERR_PLAY_STORE_UPDATE_COMPLETE", error.message, error)
            }
        }
        .addOnFailureListener { error ->
          promise.reject("ERR_PLAY_STORE_UPDATE_CHECK", error.message, error)
        }
    }.runOnQueue(Queues.MAIN)
  }

  private fun startFlexibleUpdateIfAllowed(
    manager: AppUpdateManager,
    activity: Activity,
    info: AppUpdateInfo,
    promise: Promise
  ) {
    when {
      info.installStatus() == InstallStatus.DOWNLOADED -> {
        promise.resolve(mapOf("status" to "downloaded"))
      }
      info.updateAvailability() != UpdateAvailability.UPDATE_AVAILABLE -> {
        promise.resolve(mapOf("status" to "unavailable"))
      }
      !info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE) -> {
        promise.resolve(mapOf("status" to "notAllowed"))
      }
      else -> startFlexibleUpdate(manager, activity, info, promise)
    }
  }

  private fun startFlexibleUpdate(
    manager: AppUpdateManager,
    activity: Activity,
    info: AppUpdateInfo,
    promise: Promise
  ) {
    registerInstallStateListener()
    val options = AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build()

    manager.startUpdateFlow(info, activity, options)
      .addOnSuccessListener { resultCode ->
        val status = when (resultCode) {
          Activity.RESULT_OK -> "accepted"
          Activity.RESULT_CANCELED -> "cancelled"
          else -> "failed"
        }
        promise.resolve(mapOf("status" to status))
      }
      .addOnFailureListener { error ->
        promise.reject("ERR_PLAY_STORE_UPDATE_START", error.message, error)
      }
  }

  private fun registerInstallStateListener() {
    if (installStateListener != null) return

    val listener = InstallStateUpdatedListener { state ->
      sendEvent(
        UPDATE_STATUS_EVENT,
        bundleOf(
          "status" to installStatusName(state.installStatus()),
          "bytesDownloaded" to state.bytesDownloaded().toDouble(),
          "totalBytesToDownload" to state.totalBytesToDownload().toDouble()
        )
      )
    }
    manager().registerListener(listener)
    installStateListener = listener
  }

  private fun unregisterInstallStateListener() {
    val listener = installStateListener ?: return
    updateManager?.unregisterListener(listener)
    installStateListener = null
  }

  private fun manager(): AppUpdateManager {
    val existingManager = updateManager
    if (existingManager != null) return existingManager

    return AppUpdateManagerFactory.create(requireContext()).also {
      updateManager = it
    }
  }

  private fun requireContext(): Context =
    appContext.reactContext?.applicationContext ?: throw Exceptions.ReactContextLost()

  private fun AppUpdateInfo.toResult(): Map<String, Any?> {
    val isAvailable = updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
    return mapOf(
      "updateAvailable" to isAvailable,
      "availableVersionCode" to if (isAvailable) availableVersionCode() else null,
      "stalenessDays" to clientVersionStalenessDays(),
      "priority" to if (isAvailable) updatePriority() else 0,
      "flexibleAllowed" to isUpdateTypeAllowed(AppUpdateType.FLEXIBLE),
      "installStatus" to installStatusName(installStatus())
    )
  }

  private fun installStatusName(status: Int): String = when (status) {
    InstallStatus.PENDING -> "pending"
    InstallStatus.DOWNLOADING -> "downloading"
    InstallStatus.DOWNLOADED -> "downloaded"
    InstallStatus.INSTALLING -> "installing"
    InstallStatus.INSTALLED -> "installed"
    InstallStatus.FAILED -> "failed"
    InstallStatus.CANCELED -> "cancelled"
    else -> "unknown"
  }

  companion object {
    private const val UPDATE_STATUS_EVENT = "onUpdateStatusChanged"
  }
}
