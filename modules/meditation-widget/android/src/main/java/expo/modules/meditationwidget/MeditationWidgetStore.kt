package expo.modules.meditationwidget

import android.content.Context
import org.json.JSONArray
import java.util.Calendar
import java.util.Locale

internal data class MeditationWidgetState(
  val currentStreak: Int,
  val quote: String,
  val morningCompleted: Boolean,
  val eveningCompleted: Boolean,
  val theme: String,
  val language: String,
)

internal object MeditationWidgetStore {
  private const val PREFERENCES_NAME = "meditation_widget"
  private const val KEY_CURRENT_STREAK = "current_streak"
  private const val KEY_QUOTES = "quotes"
  private const val KEY_MORNING_COMPLETED = "morning_completed"
  private const val KEY_EVENING_COMPLETED = "evening_completed"
  private const val KEY_THEME = "theme"
  private const val KEY_SNAPSHOT_DATE = "snapshot_date"
  private const val KEY_STREAK_VALID_THROUGH = "streak_valid_through"
  private const val KEY_LANGUAGE = "language"
  private const val DEFAULT_QUOTE = "Observe reality as it is, not as you wish it to be."
  private val DATE_PATTERN = Regex("\\d{4}-\\d{2}-\\d{2}")

  fun save(
    context: Context,
    currentStreak: Int,
    quotes: List<String>,
    morningCompleted: Boolean,
    eveningCompleted: Boolean,
    theme: String,
    snapshotDate: String,
    streakValidThrough: String,
    language: String,
  ) {
    val sanitizedQuotes = quotes
      .map(String::trim)
      .filter(String::isNotEmpty)
    val normalizedTheme = theme.takeIf { it in setOf("light", "dark", "auto") } ?: "auto"
    val normalizedSnapshotDate = snapshotDate.takeIf(DATE_PATTERN::matches) ?: currentDateKey()
    val normalizedStreakValidThrough = streakValidThrough.takeIf(DATE_PATTERN::matches) ?: ""
    val normalizedLanguage = language.takeIf { it in setOf("english", "hindi") } ?: "english"

    preferences(context).edit()
      .putInt(KEY_CURRENT_STREAK, currentStreak.coerceAtLeast(0))
      .putString(KEY_QUOTES, JSONArray(sanitizedQuotes).toString())
      .putBoolean(KEY_MORNING_COMPLETED, morningCompleted)
      .putBoolean(KEY_EVENING_COMPLETED, eveningCompleted)
      .putString(KEY_THEME, normalizedTheme)
      .putString(KEY_SNAPSHOT_DATE, normalizedSnapshotDate)
      .putString(KEY_STREAK_VALID_THROUGH, normalizedStreakValidThrough)
      .putString(KEY_LANGUAGE, normalizedLanguage)
      .apply()
  }

  fun load(context: Context): MeditationWidgetState {
    val preferences = preferences(context)
    val quotes = runCatching {
      val json = JSONArray(preferences.getString(KEY_QUOTES, "[]"))
      List(json.length()) { index -> json.optString(index) }
        .filter(String::isNotBlank)
    }.getOrDefault(emptyList())

    val calendar = Calendar.getInstance()
    val currentDate = currentDateKey(calendar)
    val snapshotDate = preferences.getString(KEY_SNAPSHOT_DATE, "")
      ?.takeIf(DATE_PATTERN::matches)
      .orEmpty()
    val streakValidThrough = preferences.getString(KEY_STREAK_VALID_THROUGH, "")
      ?.takeIf(DATE_PATTERN::matches)
      .orEmpty()
    val snapshotIsCurrent = snapshotDate == currentDate
    val storedStreak = preferences.getInt(KEY_CURRENT_STREAK, 0)
    val currentStreak = if (streakValidThrough >= currentDate) storedStreak else 0
    val dayOfYear = calendar.get(Calendar.DAY_OF_YEAR)
    val quote = if (quotes.isEmpty()) {
      DEFAULT_QUOTE
    } else {
      quotes[dayOfYear % quotes.size]
    }

    return MeditationWidgetState(
      currentStreak = currentStreak,
      quote = quote,
      morningCompleted = snapshotIsCurrent && preferences.getBoolean(KEY_MORNING_COMPLETED, false),
      eveningCompleted = snapshotIsCurrent && preferences.getBoolean(KEY_EVENING_COMPLETED, false),
      theme = preferences.getString(KEY_THEME, "auto") ?: "auto",
      language = preferences.getString(KEY_LANGUAGE, "english") ?: "english",
    )
  }

  internal fun currentDateKey(calendar: Calendar = Calendar.getInstance()): String =
    String.format(
      Locale.US,
      "%04d-%02d-%02d",
      calendar.get(Calendar.YEAR),
      calendar.get(Calendar.MONTH) + 1,
      calendar.get(Calendar.DAY_OF_MONTH),
    )

  private fun preferences(context: Context) =
    context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
}
