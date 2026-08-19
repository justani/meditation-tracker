package expo.modules.meditationwidget

import android.content.Context
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MeditationWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MeditationWidget")

    AsyncFunction("updateAsync") {
      currentStreak: Int,
      quotes: List<String>,
      morningCompleted: Boolean,
      eveningCompleted: Boolean,
      theme: String,
      snapshotDate: String,
      streakValidThrough: String,
      language: String ->
      val context = requireContext()
      MeditationWidgetStore.save(
        context = context,
        currentStreak = currentStreak,
        quotes = quotes,
        morningCompleted = morningCompleted,
        eveningCompleted = eveningCompleted,
        theme = theme,
        snapshotDate = snapshotDate,
        streakValidThrough = streakValidThrough,
        language = language,
      )
      MeditationWidgetProvider.updateAll(context)
    }
  }

  private fun requireContext(): Context =
    appContext.reactContext?.applicationContext
      ?: throw CodedException(
        "ERR_MEDITATION_WIDGET_CONTEXT",
        "Android application context is unavailable",
        null,
      )
}
