import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMeditation } from '../context/MeditationContext';
import { COLORS } from '../theme/colors';

export default function LanguageSelectionScreen() {
  const { updateSettings } = useMeditation();
  const [savingLanguage, setSavingLanguage] = useState(null);

  const chooseLanguage = async (language) => {
    if (savingLanguage) return;

    setSavingLanguage(language);
    const saved = await updateSettings({
      language,
      languageSelectionCompleted: true,
    });
    if (!saved) setSavingLanguage(null);
  };

  const renderChoice = ({ language, title, subtitle }) => {
    const isSaving = savingLanguage === language;
    return (
      <Pressable
        accessibilityLabel={`${title}. ${subtitle}`}
        accessibilityRole="button"
        disabled={Boolean(savingLanguage)}
        key={language}
        onPress={() => chooseLanguage(language)}
        style={({ pressed }) => [
          styles.languageButton,
          pressed && styles.languageButtonPressed,
        ]}
      >
        <View style={styles.languageCopy}>
          <Text style={styles.languageTitle}>{title}</Text>
          <Text style={styles.languageSubtitle}>{subtitle}</Text>
        </View>
        {isSaving ? (
          <ActivityIndicator color={COLORS.primaryInk} />
        ) : (
          <Ionicons name="chevron-forward" size={24} color={COLORS.primaryInk} />
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="language" size={42} color={COLORS.onPrimary} />
        </View>
        <Text style={styles.title}>Choose your language</Text>
        <Text style={styles.hindiTitle}>अपनी भाषा चुनें</Text>
        <Text style={styles.description}>
          You can change this later in Settings.
          {'\n'}आप इसे बाद में सेटिंग्स में बदल सकते हैं।
        </Text>

        <View style={styles.choices}>
          {renderChoice({
            language: 'english',
            title: 'English',
            subtitle: 'Use the app in English',
          })}
          {renderChoice({
            language: 'hindi',
            title: 'हिन्दी',
            subtitle: 'ऐप का उपयोग हिन्दी में करें',
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 44,
  },
  iconContainer: {
    width: 78,
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: COLORS.primaryActive,
    borderRadius: 24,
    marginBottom: 28,
  },
  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  hindiTitle: {
    color: COLORS.primaryInk,
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 5,
  },
  description: {
    color: COLORS.textMuted,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: 14,
  },
  choices: {
    gap: 14,
    marginTop: 34,
  },
  languageButton: {
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  languageButtonPressed: {
    backgroundColor: COLORS.primaryWash,
  },
  languageCopy: {
    flex: 1,
  },
  languageTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  languageSubtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
});
