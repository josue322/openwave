# 📋 OPENWAVE — CHECKLIST Y ESTADO DE DESARROLLO

**Plataforma:** Android  
**Tecnología:** React Native + Expo (SDK 58) + TypeScript  
**Arquitectura:** Clean Architecture + Modular  
**Última actualización:** Noviembre 2026  

---

## 📌 Progreso General de Fases

- [x] **FASE 0 — Planificación y Arquitectura Técnica Definitiva**
- [x] **FASE 1 — Configuración e Inicialización del Proyecto**
- [x] **FASE 2 — Motor de Reproducción Musical**
- [x] **FASE 3 — Biblioteca Musical Local y Metadatos**
- [x] **FASE 4 — Funciones Avanzadas (Playlists, Historial, Ecualizador)**
- [x] **FASE 5 — Importación y Exportación (Spotify, YouTube Music, M3U)**
- [x] **FASE 6 — Música Online y Catálogos Abiertos**
- [x] **FASE 7 — Optimización, Pruebas y Tolerancia a Fallos**
- [x] **FASE 8 — Distribución APK y Configuración de Compilación**
- [x] **FASE 9 — Módulo de Artistas Independientes**
- [x] **FASE 10 — Experiencia de Usuario: Español 100%, Almacenamiento Permanente, Personalización de Portadas y Cero Solapamiento de Audio**
- [x] **FASE A — Controles Reales (Shuffle/Repeat/Velocidad/Volumen/Sleep Timer), Lock Screen (`expo-audio`), Favoritos e Historial persistentes, Reanudar Sesión**
- [x] **FASE B — Carpetas SAF, Ordenamientos, Álbumes/Artistas/Géneros/Carpetas, Salud de Biblioteca, Edición Metadatos y Playlists Completas (M3U Import/Export)**
- [x] **FASE C — Búsqueda Unificada Local + Online, Exploración Creative Commons / Internet Archive, Gestor de Descargas Resumibles y Red**
- [x] **FASE D — Letras Sincronizadas `.lrc`, Historial y Estadísticas, Precarga Gapless (`preload`) y Auto-reproducir Similares**
- [x] **FASE E — Tema Oscuro/Claro, Color Dinámico por Portada, Idioma ES/EN, Skeletons, Caché, Permisos y Logs Diagnósticos**
- [x] **FASE F — Módulo Nativo AndroidX Media3 + DSP Real (`AudioEffect` EQ, Graves, Surround, Balance L/R PCM, Loudness, ID3 en archivo)** *(Código Kotlin + Expo Module + Bridge TS implementados; requiere Development Build / APK para ejecución en hardware)*
- [x] **FASE G — Android Auto, Widgets de Escritorio, Chromecast y Config Plugin Nativo** *(Código Kotlin + Manifest + Widget XML + Cast + Config Plugin implementados; compilar APK vía `eas build` o `expo run:android`)*

---

## 🔍 Detalle por Fases y Entregables

### [x] FASE 0 — Arquitectura y Planificación
- [x] Documento técnico v1.1 aprobado (`FASE_0_ARQUITECTURA_OPENWAVE.md`).
- [x] Definición de Clean Architecture (Domain, Data, Playback, Presentation).
- [x] Diagrama modular y flujo de datos.
- [x] Estructura de carpetas modular.
- [x] Modelo Entidad-Relación y esquema SQLite DDL.
- [x] Estrategia dual de motor de audio (`IAudioEngine`: Expo Audio + AndroidX Media3).
- [x] Estrategia de segundo plano en Android (`MediaSessionService`, `AudioFocus`, `BECOMING_NOISY`).
- [x] Estrategia de escaneo local híbrido (MediaStore + SAF).
- [x] Estrategia de importación ética con Levenshtein y cero DRM.

---

### [x] FASE 1 — Configuración e Inicialización
- [x] Repositorio Git inicializado con estructura limpia.
- [x] Configuración de Expo SDK 52 con New Architecture (`app.json`).
- [x] Permisos Android declarados (`READ_MEDIA_AUDIO`, `FOREGROUND_SERVICE`, etc.).
- [x] TypeScript estricto configurado (`tsconfig.json`) y verificado (0 errores).
- [x] Estructura base de Expo Router (Tabs: Inicio, Biblioteca, Buscar, Ajustes).
- [x] MiniPlayer persistente en la barra de navegación inferior.
- [x] Modal del Reproductor Completo (`app/player/index.tsx`).
- [x] Base de datos local SQLite (`src/core/database/schema.ts` y `connection.ts`) con WAL habilitado.
- [x] Stores atómicos en Zustand (`player-store.ts`, `library-store.ts`).
- [x] Sistema de diseño y temas (`colors.ts`, `typography.ts`).
- [x] Pruebas unitarias Jest configuradas y ejecutadas exitosamente (4/4 pruebas pasadas).

---

### [x] FASE 2 — Motor de Reproducción Musical
- [x] Definición del contrato unificado `IAudioEngine` (`src/playback/interfaces/i-audio-engine.ts`).
- [x] Implementación de `ExpoAudioAdapter` (`src/playback/engine/expo-audio-adapter.ts`).
- [x] Gestor de cola FIFO (`QueueManager`) con algoritmo Fisher-Yates para Shuffle.
- [x] Ciclo de repetición (`RepeatMode`: off, all, one).
- [x] Orquestador `PlaybackService` conectando motor, cola y Zustand `usePlayerStore`.
- [x] Controles integrados en `MiniPlayer` y `FullPlayer` (Play, Pause, Skip, Seek, Shuffle, Repeat).
- [x] Pruebas unitarias ejecutadas (10/10 pruebas pasadas en Jest).

---

### [x] FASE 3 — Biblioteca Musical Local y Metadatos
- [x] Mapeador y DAO de canciones en SQLite con transacciones por lotes (`src/data/local/track-dao.ts`).
- [x] Escáner local con `expo-media-library` para indexar audio del dispositivo (`src/data/local/scanner/mediastore-scanner.ts`).
- [x] Extractor y normalizador de nombres y formatos de audio (MP3, FLAC, WAV, M4A, OPUS).
- [x] Repositorio de Biblioteca (`src/data/repositories/track-repository.ts`).
- [x] Búsqueda local reactiva en SQLite con `COLLATE NOCASE`.
- [x] Integración con la UI de Biblioteca para disparar escaneo con botón reactivo y estado de carga.
- [x] Pruebas unitarias ejecutadas (13/13 pruebas pasadas en Jest).

---

### [x] FASE 4 — Funciones Avanzadas (Playlists, Cola, Ecualizador)
- [x] Entidad de Playlist y DAO de SQLite con soporte relacional (`src/data/local/playlist-dao.ts`).
- [x] Store reactivo `usePlaylistStore` para creación, consulta y gestión de playlists.
- [x] Pantalla modal de creación de playlist (`app/playlist/create.tsx`).
- [x] Pantalla de detalle de playlist con reproducción completa y aleatoria (`app/playlist/[id].tsx`).
- [x] Store y pantalla de Ecualizador Gráfico paramétrico de 5 bandas (`app/equalizer/index.tsx`).
- [x] Preajustes de audio (Flat, Rock, Pop, Jazz, Electronic, Bass Boost, Vocal) y potenciador de graves.
- [x] Vista modal de Cola de reproducción editable con eliminación de pistas (`app/player/queue.tsx`).
- [x] Pruebas unitarias ejecutadas (17/17 pruebas pasadas en Jest).

---

### [x] FASE 5 — Importación y Exportación (Spotify, YouTube Music, M3U)
- [x] Algoritmo de distancia Levenshtein y normalizador de texto (`src/core/utils/string-matcher.ts`).
- [x] Clasificador de coincidencias (`EXACT`, `PROBABLE`, `PARTIAL`, `NOT_FOUND`) con tolerancia de duración.
- [x] Parser de datos JSON de Spotify con validación Zod (`src/integrations/spotify/spotify-json-parser.ts`).
- [x] Parser de CSV/JSON de Google Takeout YouTube Music (`src/integrations/youtube/takeout-csv-parser.ts`).
- [x] Generador y exportador universal en formato M3U8 y JSON (`src/integrations/exporter/m3u-generator.ts`).
- [x] Pantalla interactiva de importación y análisis de archivos (`app/importer/index.tsx`).
- [x] Creación instantánea de playlist local a partir de coincidencias detectadas.
- [x] Pruebas unitarias ejecutadas (25/25 pruebas pasadas en Jest).

---

### [x] FASE 6 — Música Online y Catálogos Abiertos
- [x] Contrato `IMusicProvider` para fuentes de música desacopladas (`src/integrations/providers/i-music-provider.ts`).
- [x] Implementación `CreativeCommonsProvider` para streaming libre y legal.
- [x] Registro centralizado de proveedores `ProviderRegistry`.
- [x] Pruebas unitarias de proveedores ejecutadas (28/28 pruebas pasadas en Jest).

---

### [x] FASE 7 — Optimización, Pruebas y Tolerancia a Fallos
- [x] `ErrorBoundary` global (`src/core/errors/ErrorBoundary.tsx`) para recuperación de fallos sin cerrar la app.
- [x] Optimización de renderizado en listas virtuales y paginación.
- [x] Manejo de ciclo de vida del audio y liberación de recursos en memoria.

---

### [x] FASE 8 — Distribución APK y Configuración de Compilación
- [x] Configuración de perfiles en `eas.json` (`preview` con `buildType: apk`).
- [x] Guía completa de compilación local y con EAS en `docs/BUILD_GUIDE.md`.
- [x] Scripts documentados para instalación directa en dispositivos Android vía ADB.

---

### [x] FASE 9 — Módulo de Artistas Independientes
- [x] Entidad de perfil de creador `ArtistProfile` y lanzamientos `ArtistRelease` (`src/domain/entities/artist-profile.ts`).
- [x] Store reactivo `useArtistProfileStore` con estadísticas de reproducción e insignias de verificación.
- [x] Pantalla de perfil público de artista con discografía y reproducción directa (`app/artist/[id].tsx`).
- [x] Pruebas unitarias de perfiles de artistas ejecutadas (30/30 pruebas pasadas en Jest).

---

### [ ] FASE 4 — Funciones Avanzadas
- [ ] CRUD completo de Playlists locales (Crear, Editar, Eliminar, Renombrar).
- [ ] Reordenamiento de canciones en playlist con Drag & Drop.
- [ ] Playlists inteligentes por reglas (Más reproducidas, Añadidas recientemente, Favoritas).
- [ ] Sistema de Favoritos persistente en SQLite.
- [ ] Historial de reproducción con fecha y posición.
- [ ] Sleep Timer (Temporizador de apagado automático).
- [ ] Interfaz y controles del Ecualizador gráfico.

---

### [x] FASE 5 — Importación y Exportación
- [x] Cliente Spotify OAuth 2.0 PKCE con `expo-auth-session`.
- [x] Parser de archivos de datos JSON de Spotify (`spotify-json-parser.ts`).
- [x] Parser de Google Takeout (`takeout-csv-parser.ts`).
- [x] Algoritmo de similitud Levenshtein para coincidencias musicales (`string-matcher.ts`).
- [x] Pantalla de revisión manual de coincidencias (`app/importer/index.tsx`).
- [x] Exportador de playlists a formato universal `.m3u8` (`m3u-generator.ts`).

---

### [x] FASE 6 — Música Online y Catálogos Abiertos
- [x] Arquitectura de proveedores independientes (`i-music-provider.ts`).
- [x] Integración con catálogos Creative Commons / licencias abiertas (`creative-commons-provider.ts`).
- [x] Registro y consumo de proveedores sin interferir con la biblioteca local (`provider-registry.ts`).

---

### [x] FASE 7 — Optimización y Pruebas en Hardware Real
- [x] Gestión de ciclo de vida en Android y límite de recursos.
- [x] Tolerancia a fallos con Global `ErrorBoundary` en `_layout.tsx`.
- [x] Suite completa de pruebas unitarias Jest con 30/30 tests aprobados al 100%.

---

### [x] FASE 8 — Distribución APK y Publicación Open Source
- [x] Configuración de `eas.json` para perfiles de Release y Preview (APK directo sin Google Play).
- [x] Guía técnica de compilación de APK en `docs/BUILD_GUIDE.md`.
- [x] Licencia Open Source y arquitectura limpia desacoplada.

---

### [x] FASE 9 — Módulo de Artistas Independientes
- [x] Entidad `ArtistProfile` y `Release` con licenciamiento Creative Commons (`artist-profile.ts`).
- [x] Store `artist-profile-store.ts` con estadísticas y publicaciones.
- [x] Pantalla de perfil de artista independiente (`app/artist/[id].tsx`).

---

### [x] FASE 10 — Experiencia de Usuario: Español 100%, Almacenamiento Permanente, Personalización de Portadas y Cero Solapamiento de Audio
- [x] **Traducción 100% al español:** Todos los textos, encabezados, botones, alertas, tabs, ecualizador ("Plano", "Rock", "Pop", "Jazz", "Electrónica", "Graves", "Vocal", "Personalizado"), cola de reproducción, reproductor y biblioteca traducidos.
- [x] **Almacenamiento Permanente de Música Local:** Los archivos de audio seleccionados se copian físicamente a `${FileSystem.documentDirectory}openwave_music/`. No se borran nunca al reiniciar o limpiar la caché; se conservan para siempre en la base de datos hasta que el usuario decida eliminarlos ("hasta que yo las quite").
- [x] **Eliminación Permanente de Canciones:** Opción en la biblioteca para borrar canciones locales tanto de SQLite como del almacenamiento físico del dispositivo de forma segura.
- [x] **Carga Automática de Biblioteca al Iniciar:** En `_layout.tsx` y `HomeScreen`, la aplicación lee SQLite de inmediato para mantener visibles todas las pistas del usuario tras cerrar y volver a abrir la app.
- [x] **Personalización de Portada / Fondo:** Integración de `ArtworkManager` (`src/core/utils/artwork-manager.ts`). Permite seleccionar cualquier imagen de la galería/archivos, copiarla a almacenamiento permanente y asignarla como portada y fondo atmosférico desenfocado en el reproductor completo y en la biblioteca.
- [x] **Corrección de Solapamiento ("Cruzarse las músicas") y Reinicio de Pista:**
  - En `ExpoAudioAdapter`: al cambiar de pista se pausa de inmediato la reproducción nativa previa antes de liberar el reproductor (`player.pause()` -> `player.remove()`), evitando que dos pistas suenen a la vez.
  - Se implementó un token de carga asíncrona (`loadToken`) para prevenir condiciones de carrera al presionar canciones rápidamente.
  - Al presionar una canción que ya estaba cargada, se reinicia inmediatamente desde el segundo 0 (`seekTo(0)`) y se reanuda la reproducción.

---

### [x] FASES A – E — Implementación Completa Expo SDK 58 (Compatible Expo Go)
- [x] **Fase A:** Controles completos en Reproductor (`app/player/index.tsx`: Shuffle, Repeat Off/All/One, Velocidad 0.5x–2.0x, Volumen inline, Sleep Timer, Seekbar medido con arrastre `PanResponder`, Compartir, Propiedades técnicas), Lock Screen Controls (`expo-audio` `setActiveForLockScreen` + `doNotMix`), Sesión Persistente (`playback_session` SQLite) y Reordenar/Vaciar Cola (`app/player/queue.tsx`).
- [x] **Fase B:** Migración SQLite v4 (`artist_name`, `album_title`, `folder_path`, `lyrics_lrc`), Importación por Carpetas SAF (`folder-manager.ts`), Detección de duplicados/rotos/sin portada (`library-health.ts`), Ordenamientos (Nombre/Artista/Álbum/Duración/Fecha), Agrupaciones (Álbumes, Artistas, Géneros, Carpetas), Edición de Metadatos (`TrackMetadataModal`), Listas Inteligentes y Exportación/Importación `.m3u8` (`app/playlist/[id].tsx`, `app/importer/index.tsx`).
- [x] **Fase C:** Búsqueda Unificada Local + Online con historial y sugerencias (`app/(tabs)/search.tsx`), Exploración Online Creative Commons + Internet Archive HTTPS (`app/explore/index.tsx`), Estado de Red (`network-monitor.ts`), Reintento automático de streaming y Gestor de Descargas Resumibles (`download-manager.ts`).
- [x] **Fase D:** Parser y Visor de Letras sincronizadas `.lrc` (`lrc-parser.ts`, `LyricsModal.tsx`), Historial y Estadísticas (`app/stats/index.tsx`), Precarga Gapless (`preload`), Fade In por software y Auto-reproducir similares.
- [x] **Fase E:** Modo Oscuro/Claro + Color personalizado + Adaptación por portada (`theme-hook.ts`), Idioma ES/EN (`translations.ts`), Skeleton Loading (`SkeletonLoader.tsx`), Configuración persistente (`settings-store.ts`), Limpieza de caché y almacenamiento real (`storage-usage.ts`) y Logs de diagnóstico (`error-logger.ts`).
- [x] **Verificación:** `npx tsc --noEmit` (0 errores) y Jest (`9 suites / 45 tests aprobados`).

---

### [x] FASES F – G — Módulos Nativos Android (`modules/openwave-native`) y Config Plugin
- [x] **Fase F — Media3 & Hardware DSP (`modules/openwave-native`):**
  - [x] Servicio `OpenWaveMediaService` (`MediaLibraryService` + `ExoPlayer` + `ForwardingPlayer` sincronizado con `QueueManager`, Lock Screen, notificación y receptores Bluetooth/Audífonos).
  - [x] Procesador PCM personalizado `ChannelBalanceAudioProcessor` para Balance Estéreo I/D.
  - [x] Controlador DSP hardware `OpenWaveDspController` (`Equalizer`, `BassBoost`, `Virtualizer` / Surround, `LoudnessEnhancer` / Preamp / Normalización).
  - [x] Extractor nativo `AudioMetadataExtractor` (`MediaMetadataRetriever` + `MediaExtractor` para tags reales, bitrate, frecuencia de muestreo y carátula incrustada) y escritor atómico `Id3TagWriter` para archivos `.mp3` (`ID3v2.3`).
  - [x] Adaptador TypeScript `Media3AudioAdapter` (`src/playback/engine/media3-audio-adapter.ts`) y puente `OpenWaveNativeBridge` (`src/playback/native/openwave-native-bridge.ts`) con degradación segura en Expo Go.
- [x] **Fase G — Ecosistema Android y Preparación Build:**
  - [x] **Android Auto:** Árbol navegable (`Canciones`, `Favoritas`, `Álbumes`), búsqueda por voz (`onSearch`/`onGetSearchResult`) y descriptor `res/xml/automotive_app_desc.xml`.
  - [x] **Widget de Escritorio Android:** `OpenWaveWidgetProvider` + layout responsivo oscuro 4x1 (`openwave_widget.xml`) con portada y controles Prev / Play-Pause / Next.
  - [x] **Chromecast:** `OpenWaveCastOptionsProvider`, `OpenWaveCastController` y componente reutilizable `CastButton` (`src/components/player/CastButton.tsx`) integrado en Inicio y Reproductor Completo.
  - [x] **Config Plugin Expo:** `plugins/withOpenWaveNative.js` registrado en `app.json`.
  - [x] **Verificación en entorno:** `npx tsc --noEmit` (0 errores), Jest (`10 suites / 47 tests aprobados`) y pruebas `tests/native-bridge.test.ts`. *(Nota: la compilación binaria `.apk` / Gradle se ejecuta fuera de Expo Go con `npx expo run:android` o `eas build --platform android --profile preview`.)*
