// Helper function to validate locale using native Intl API
function isValidLocale(locale: string): boolean {
  try {
    const formatter = new Intl.DateTimeFormat(locale);
    return (
      formatter.resolvedOptions().locale === locale ||
      formatter.resolvedOptions().locale.startsWith(locale)
    );
  } catch {
    return false;
  }
}

// add all supported locales
let locals: { code: string; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'en-GB', label: 'English (United Kingdom)', flag: '🇬🇧' },
  { code: 'en-US', label: 'English (United States)', flag: '🇺🇸' },
  { code: 'en-AU', label: 'English (Australia)', flag: '🇦🇺' },
  { code: 'en-CA', label: 'English (Canada)', flag: '🇨🇦' },
  { code: 'en-NZ', label: 'English (New Zealand)', flag: '🇳🇿' },
  { code: 'es', label: 'Spanish', flag: '🇪🇸' },
  { code: 'es-ES', label: 'Spanish (Spain)', flag: '🇪🇸' },
  { code: 'es-MX', label: 'Spanish (Mexico)', flag: '🇲🇽' },
  { code: 'fr', label: 'French', flag: '🇫🇷' },
  { code: 'fr-FR', label: 'French (France)', flag: '🇫🇷' },
  { code: 'de', label: 'German', flag: '🇩🇪' },
  { code: 'de-DE', label: 'German (Germany)', flag: '🇩🇪' },
  { code: 'it', label: 'Italian', flag: '🇮🇹' },
  { code: 'it-IT', label: 'Italian (Italy)', flag: '🇮🇹' },
  { code: 'pt', label: 'Portuguese', flag: '🇵🇹' },
  { code: 'pt-PT', label: 'Portuguese (Portugal)', flag: '🇵🇹' },
  { code: 'pt-BR', label: 'Portuguese (Brazil)', flag: '🇧🇷' },
  { code: 'ru', label: 'Russian', flag: '🇷🇺' },
  { code: 'ru-RU', label: 'Russian (Russia)', flag: '🇷🇺' },
  { code: 'zh', label: 'Chinese', flag: '🇨🇳' },
  { code: 'zh-CN', label: 'Chinese (Simplified)', flag: '🇨🇳' },
  { code: 'zh-TW', label: 'Chinese (Traditional)', flag: '🇹🇼' },
  { code: 'ja', label: 'Japanese', flag: '🇯🇵' },
  { code: 'ja-JP', label: 'Japanese (Japan)', flag: '🇯🇵' },
  { code: 'ko', label: 'Korean', flag: '🇰🇷' },
  { code: 'ko-KR', label: 'Korean (South Korea)', flag: '🇰🇷' },
  { code: 'ar', label: 'Arabic', flag: '🇸🇦' },
  { code: 'ar-SA', label: 'Arabic (Saudi Arabia)', flag: '🇸🇦' },
  { code: 'hi', label: 'Hindi', flag: '🇮🇳' },
  { code: 'hi-IN', label: 'Hindi (India)', flag: '🇮🇳' },
  { code: 'bn', label: 'Bengali', flag: '🇮🇳' },
  { code: 'bn-IN', label: 'Bengali (India)', flag: '🇮🇳' },
  { code: 'gu', label: 'Gujarati', flag: '🇮🇳' },
  { code: 'gu-IN', label: 'Gujarati (India)', flag: '🇮🇳' },
  { code: 'ta', label: 'Tamil', flag: '🇮🇳' },
  { code: 'ta-IN', label: 'Tamil (India)', flag: '🇮🇳' },
  { code: 'te', label: 'Telugu', flag: '🇮🇳' },
  { code: 'te-IN', label: 'Telugu (India)', flag: '🇮🇳' },
  { code: 'ml', label: 'Malayalam', flag: '🇮🇳' },
  { code: 'ml-IN', label: 'Malayalam (India)', flag: '🇮🇳' },
  { code: 'kn', label: 'Kannada', flag: '🇮🇳' },
  { code: 'kn-IN', label: 'Kannada (India)', flag: '🇮🇳' },
  { code: 'mr', label: 'Marathi', flag: '🇮🇳' },
  { code: 'mr-IN', label: 'Marathi (India)', flag: '🇮🇳' },
  { code: 'pa', label: 'Punjabi', flag: '🇮🇳' },
  { code: 'pa-IN', label: 'Punjabi (India)', flag: '🇮🇳' },
  { code: 'ur', label: 'Urdu', flag: '🇮🇳' },
  { code: 'ur-IN', label: 'Urdu (India)', flag: '🇮🇳' },
  { code: 'or', label: 'Odia', flag: '🇮🇳' },
  { code: 'or-IN', label: 'Odia (India)', flag: '🇮🇳' },
  { code: 'as', label: 'Assamese', flag: '🇮🇳' },
  { code: 'as-IN', label: 'Assamese (India)', flag: '🇮🇳' },
  { code: 'zh-HK', label: 'Chinese (Hong Kong)', flag: '🇭🇰' },
  { code: 'nl', label: 'Dutch', flag: '🇳🇱' },
  { code: 'nl-NL', label: 'Dutch (Netherlands)', flag: '🇳🇱' },
  { code: 'pl', label: 'Polish', flag: '🇵🇱' },
  { code: 'pl-PL', label: 'Polish (Poland)', flag: '🇵🇱' },
  { code: 'sv', label: 'Swedish', flag: '🇸🇪' },
  { code: 'sv-SE', label: 'Swedish (Sweden)', flag: '🇸🇪' },
  { code: 'da', label: 'Danish', flag: '🇩🇰' },
  { code: 'da-DK', label: 'Danish (Denmark)', flag: '🇩🇰' },
  { code: 'no', label: 'Norwegian', flag: '🇳🇴' },
  { code: 'no-NO', label: 'Norwegian (Norway)', flag: '🇳🇴' },
  { code: 'fi', label: 'Finnish', flag: '🇫🇮' },
  { code: 'fi-FI', label: 'Finnish (Finland)', flag: '🇫🇮' },
  { code: 'tr', label: 'Turkish', flag: '🇹🇷' },
  { code: 'tr-TR', label: 'Turkish (Turkey)', flag: '🇹🇷' },
  { code: 'cs', label: 'Czech', flag: '🇨🇿' },
  { code: 'cs-CZ', label: 'Czech (Czech Republic)', flag: '🇨🇿' },
  { code: 'sk', label: 'Slovak', flag: '🇸🇰' },
  { code: 'sk-SK', label: 'Slovak (Slovakia)', flag: '🇸🇰' },
  { code: 'hu', label: 'Hungarian', flag: '🇭🇺' },
  { code: 'hu-HU', label: 'Hungarian (Hungary)', flag: '🇭🇺' },
  { code: 'ro', label: 'Romanian', flag: '🇷🇴' },
  { code: 'ro-RO', label: 'Romanian (Romania)', flag: '🇷🇴' },
  { code: 'el', label: 'Greek', flag: '🇬🇷' },
  { code: 'el-GR', label: 'Greek (Greece)', flag: '🇬🇷' },
  { code: 'th', label: 'Thai', flag: '🇹🇭' },
  { code: 'th-TH', label: 'Thai (Thailand)', flag: '🇹🇭' },
  { code: 'id', label: 'Indonesian', flag: '🇮🇩' },
  { code: 'id-ID', label: 'Indonesian (Indonesia)', flag: '🇮🇩' },
  { code: 'ms', label: 'Malay', flag: '🇲🇾' },
  { code: 'ms-MY', label: 'Malay (Malaysia)', flag: '🇲🇾' },
  { code: 'vi', label: 'Vietnamese', flag: '🇻🇳' },
  { code: 'vi-VN', label: 'Vietnamese (Vietnam)', flag: '🇻🇳' },
  { code: 'he', label: 'Hebrew', flag: '🇮🇱' },
  { code: 'he-IL', label: 'Hebrew (Israel)', flag: '🇮🇱' },
];
// remove duplicates
locals = locals.filter(
  (value, index, self) =>
    index === self.findIndex(t => t.code === value.code && t.label === value.label)
);
// sort by label
locals.sort((a, b) => {
  if (a.label < b.label) {
    return -1;
  }
  if (a.label > b.label) {
    return 1;
  }
  return 0;
});
// filter to only valid locales using native Intl API
const languages: { value: string; label: string; flag: string }[] = locals
  .filter(e => isValidLocale(e.code))
  // remove duplicates
  .filter(
    (value, index, self) =>
      index === self.findIndex(t => t.code === value.code && t.label === value.label)
  )
  .map(e => ({ value: e.code, label: e.label, flag: e.flag }));
export { languages };
