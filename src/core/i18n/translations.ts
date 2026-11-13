import { useSettingsStore, AppLanguage } from '../../store/settings-store';

export const TRANSLATIONS = {
  es: {
    tabs: {
      home: 'Inicio',
      library: 'Biblioteca',
      search: 'Buscar',
      settings: 'Ajustes',
    },
    home: {
      trackMix: 'Mix de canciones',
      albumMix: 'Mix de álbumes',
      decadeMix: 'Mix por décadas',
      queues: 'Cola de pistas',
      uploadLocal: 'Subir Música Local',
      exploreOnline: 'Explorar Online',
      mostPlayed: 'ÁLBUMES MÁS ESCUCHADOS',
      recentlyAdded: 'AÑADIDOS RECIENTEMENTE',
    },
    settings: {
      title: 'Ajustes',
      playbackSection: 'Reproducción y Motor de Audio',
      headphonesSection: 'Audífonos y Bluetooth',
      librarySection: 'Biblioteca y Carpetas',
      appearanceSection: 'Apariencia e Idioma',
      storageSection: 'Almacenamiento y Permisos',
      diagnosticsSection: 'Diagnóstico y Sistema',
    },
  },
  en: {
    tabs: {
      home: 'Home',
      library: 'Library',
      search: 'Search',
      settings: 'Settings',
    },
    home: {
      trackMix: 'Track mix',
      albumMix: 'Album mix',
      decadeMix: 'Decade mix',
      queues: 'Queues',
      uploadLocal: 'Upload Local Music',
      exploreOnline: 'Explore Online',
      mostPlayed: 'MOST PLAYED ALBUMS',
      recentlyAdded: 'RECENTLY ADDED ALBUMS',
    },
    settings: {
      title: 'Settings',
      playbackSection: 'Playback & Audio Engine',
      headphonesSection: 'Headphones & Bluetooth',
      librarySection: 'Library & Folders',
      appearanceSection: 'Appearance & Language',
      storageSection: 'Storage & Permissions',
      diagnosticsSection: 'Diagnostics & System',
    },
  },
} as const;

export function getTranslations(lang: AppLanguage) {
  return TRANSLATIONS[lang] || TRANSLATIONS.es;
}

export function useTranslation() {
  const language = useSettingsStore((s) => s.language);
  return {
    language,
    t: getTranslations(language),
  };
}

