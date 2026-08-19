import { useCallback } from 'react';
import { useMeditation } from '../context/MeditationContext';
import { getLanguageLocale, translate } from '../i18n';

export const useTranslation = () => {
  const { settings } = useMeditation();
  const language = settings.language === 'hindi' ? 'hindi' : 'english';
  const t = useCallback(
    (key, values) => translate(language, key, values),
    [language]
  );

  return {
    language,
    locale: getLanguageLocale(language),
    t,
  };
};
