# 🌊 OpenWave — Reproductor Musical Offline-First de Alta Fidelidad

<p align="center">
  <img src="assets/icon.png" alt="OpenWave Logo" width="128" height="128" style="border-radius: 24px;" />
</p>

<p align="center">
  <strong>Reproductor de audio independiente, potente y moderno para Android.</strong><br>
  Construido con React Native, Expo SDK 58, TypeScript y un módulo nativo en Kotlin potenciado por AndroidX Media3 (ExoPlayer).
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Plataforma-Android-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Android" />
  <img src="https://img.shields.io/badge/Expo-SDK_58-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo SDK 58" />
  <img src="https://img.shields.io/badge/TypeScript-Strict_Mode-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Audio_Engine-AndroidX_Media3-FF6F00?style=for-the-badge&logo=google&logoColor=white" alt="Media3" />
  <img src="https://img.shields.io/badge/Base_de_Datos-SQLite_WAL-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/Tests-51%2F51_Passing-success?style=for-the-badge&logo=jest&logoColor=white" alt="Tests" />
  <img src="https://img.shields.io/badge/Licencia-MIT-blue?style=for-the-badge" alt="Licencia MIT" />
</p>

---

## 💡 Filosofía y Propuesta de Valor

OpenWave nace para devolverle al usuario el control total sobre su biblioteca musical:
- 🛡️ **100% Offline-First y Privacidad Absoluta:** Sin anuncios, sin telemetría, sin suscripciones obligatorias y sin recolectar tus hábitos de escucha.
- ⚡ **Rendimiento de Hardware:** Diseñado con procesamiento de señal digital (DSP) por hardware nativo para un consumo mínimo de batería y cero cortes de audio.
- 📂 **Soberanía de Datos:** Acceso directo a tu almacenamiento local (incluyendo tarjetas MicroSD y USB OTG), con importadores éticos para migrar tus bibliotecas desde Spotify y YouTube Music.

---

## ✨ Características Principales

### 🎧 1. Motor de Audio Avanzado (AndroidX Media3 / ExoPlayer)
- **Segundo plano real:** Servicio nativo `MediaSessionService` (`OpenWaveMediaService`) tolerante a la suspensión del sistema por ahorro de batería.
- **Cortina de notificaciones interactiva:** Notificación multimedia de Android 13+ con barra de progreso deslizable en tiempo real (*scrubber* interactivo), botones de cambio de pista, reproducción/pausa y botón de favoritos.
- **Pantalla de bloqueo:** Controles de transporte integrados y arte del álbum en alta definición.
- **Gestión inteligente de foco de audio:** Pausa automática o atenuación (*ducking*) al recibir llamadas telefónicas o notificaciones sonoras.
- **Desconexión segura:** Pausa inmediata al desconectar auriculares o apagar dispositivos Bluetooth (`ACTION_AUDIO_BECOMING_NOISY`).
- **Widgets y ecosistema:**
  - 📱 **Widget 4x1 para el escritorio** de Android con controles directos.
  - 🚗 Soporte para **Android Auto**.
  - 📺 Soporte para transmisión vía **Google Cast / Chromecast**.

### 🎚️ 2. Ecualizador Gráfico & DSP en Hardware
- **Ecualizador paramétrico de 5 bandas** accionado directamente por el procesador de efectos de audio de Android (`android.media.audiofx.Equalizer`).
- **Procesador de balance estéreo:** Control fino L/R mediante procesador de audio PCM nativo (`ChannelBalanceAudioProcessor`).
- **Potenciador de graves y virtualizador:** Refuerzo de bajas frecuencias (*Bass Boost*) y sonido envolvente virtual (*Virtualizer*).
- **Presets de fábrica y personalizados:** Modos preconfigurados (Rock, Pop, Jazz, Clásica, Danza, Flat, etc.) y guardado en SQLite de tus propias curvas acústicas.

### 📁 3. Escaneo Inteligente y Edición de Metadatos
- **Escaneo dual híbrido:** Detección instantánea mediante **Android MediaStore API** y exploración selectiva de carpetas mediante **Storage Access Framework (SAF)** (ideal para carpetas ocultas o tarjetas SD).
- **Extractor nativo de metadatos:** Lectura de carátulas incrustadas, artista, álbum, año, género, duración, bitrate, sample rate y canales.
- **Editor ID3 en archivo físico:** Corrección de títulos, artistas y géneros directamente en los archivos `.mp3` mediante `Id3TagWriter`.
- **Salud de la biblioteca:** Herramienta para detectar canciones huérfanas, archivos duplicados o pistas sin carátula.

### 🔄 4. Importación y Migración Ética
- **Importador de Spotify:** Compatible con paquetes de datos personales GDPR de Spotify (`Playlist1.json`, `YourLibrary.json`, `StreamingHistory_*.json`) y archivos CSV generados por herramientas como Exportify.
- **Importador de YouTube Music:** Compatible con exportaciones de Google Takeout y archivos CSV de listas de reproducción.
- **Exportador M3U / M3U8:** Genera archivos de listas de reproducción universales compatibles con cualquier reproductor.

### 🌐 5. Música Online Legal & Descargas
- Acceso integrado a catálogos abiertos y legales (**Creative Commons** e **Internet Archive**).
- Búsqueda unificada local + online.
- Gestor de descargas para guardar canciones directamente en tu memoria local y reproducirlas sin conexión.

### 🎤 6. Letras Sincronizadas (.LRC)
- Visualización de letras en tiempo real sincronizadas milisegundo a milisegundo con el progreso de la pista.

### 🎨 7. Experiencia de Usuario & UI/UX Pulida
- **Mini reproductor flotante:** Con protección total de áreas seguras (`SafeAreaInsets`), evitando cualquier solapamiento con los botones de navegación del sistema Android (`□ ○ ◁`) o gestos.
- **Acceso rápido a Favoritos:** Botón de un toque en la pantalla de inicio para acceder a tus canciones preferidas.
- **Cola inteligente:** Reordenamiento mediante *drag & drop*, modo aleatorio con algoritmo Fisher-Yates y repetición (Off, Todo, Una).
- **Estética Dark AMOLED:** Interfaz moderna, minimalista y diseñada para no cansar la vista ni consumir batería innecesaria en pantallas OLED.

---

## 🏛️ Arquitectura del Software (Clean Architecture)

El proyecto sigue una arquitectura estricta por capas desacopladas, lo que garantiza testeabilidad, estabilidad y fácil mantenimiento:

```
┌───────────────────────────────────────────────────────────┐
│                  CAPA DE PRESENTACIÓN                     │
│        Expo Router (App) + React Native Reanimated        │
│        Pantallas: Inicio, Biblioteca, Player, Ajustes     │
└─────────────────────────────┬─────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│                 CAPA DE ESTADO (ZUSTAND)                  │
│   PlayerStore | LibraryStore | EqualizerStore | Settings  │
└─────────────────────────────┬─────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│                    CAPA DE DOMINIO                        │
│          Entidades (Track, Playlist, Equalizer)           │
│        Casos de Uso + Interfaces (IAudioEngine)           │
└─────────────────────────────┬─────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│                     CAPA DE DATOS                         │
│   SQLite WAL (TrackDao, PlaylistDao, SessionDao)          │
│   FileSystem + Escáner MediaStore & SAF                   │
│   Importadores (Spotify JSON, Takeout CSV, M3U)           │
└─────────────────────────────┬─────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│                 CAPA DE HARDWARE / AUDIO                  │
│    Módulo Nativo Kotlin (`modules/openwave-native`)       │
│    AndroidX Media3 + ExoPlayer + AudioEffect DSP          │
└───────────────────────────────────────────────────────────┘
```

---

## 📁 Estructura del Directorio

```text
OPENWAVE/
├── android/                         # Proyecto Android nativo (Gradle, Manifest, NDK/CMake)
├── app/                             # Rutas y navegación (Expo Router)
│   ├── (tabs)/                      # Pestañas principales (Inicio, Biblioteca, Buscar, Ajustes)
│   ├── equalizer/                   # Pantalla y controles del Ecualizador
│   ├── importer/                    # Asistente de importación (Spotify / YouTube Music)
│   ├── player/                      # Reproductor a pantalla completa y cola
│   ├── playlist/                    # Detalle y gestión de listas de reproducción
│   └── _layout.tsx                  # Root layout y orquestación de arranque
├── assets/                          # Íconos de alta definición, splash screen e imágenes
├── modules/
│   └── openwave-native/             # Módulo nativo Expo en Kotlin
│       └── android/src/main/java/   # Servicios Media3, DSP Controller, Widgets y Notificaciones
├── src/
│   ├── components/                  # Componentes de interfaz (MiniPlayer, CastButton, Skeletons)
│   ├── core/                        # Base de datos SQLite, migraciones, i18n, utilidades
│   ├── data/                        # DAOs, repositorios locales y de red
│   ├── domain/                      # Entidades y contratos de negocio
│   ├── integrations/                # Parsers de Spotify, YouTube Music y proveedores Creative Commons
│   ├── playback/                    # Implementaciones de IAudioEngine y servicio de reproducción
│   ├── store/                       # Stores atómicos reactivos de Zustand
│   └── theme/                       # Tokens de diseño, tipografía y paleta de colores
└── tests/                           # Batería de pruebas unitarias automatizadas (Jest)
```

---

## 🚀 Guía de Instalación y Uso

### Opción 1: Instalar el APK directo en tu teléfono (Recomendado)
1. Descarga el archivo compilado `OpenWave.apk` desde la raíz de este proyecto o desde la sección de **Releases** en GitHub.
2. Cópialo a tu teléfono Android (o descárgalo directamente desde el navegador del móvil).
3. Abre el archivo `.apk` y concede permisos para *"Instalar aplicaciones de fuentes desconocidas"*.
4. ¡Abre OpenWave y comienza a disfrutar de tu música!

---

### Opción 2: Compilación y Desarrollo desde el Código Fuente

#### Requisitos Previos:
- **Node.js:** Versión 18 o superior.
- **Java Development Kit (JDK):** Versión 17.
- **Android SDK:** Con API Level 34 o 35 instalado.
- **Expo CLI:** `npm install -g expo-cli`

#### Pasos:

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/TU_USUARIO/openwave.git
   cd openwave
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Ejecutar el servidor de desarrollo:**
   ```bash
   npx expo start
   ```

4. **Compilar y ejecutar en un dispositivo o emulador Android:**
   ```bash
   npx expo run:android
   ```

5. **Generar un APK Release optimizado localmente:**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
   *El APK generado se ubicará en: `android/app/build/outputs/apk/release/app-release.apk`.*

---

## 🧪 Pruebas Unitarias y Calidad de Código

El proyecto cuenta con una cobertura de pruebas exhaustiva para garantizar la estabilidad de la base de datos, los cálculos de audio, la lógica de cola y los importadores:

```bash
# Ejecutar verificación estricta de tipos TypeScript
npx tsc --noEmit

# Ejecutar suite de pruebas unitarias con Jest
npm test
```

Resultado de las pruebas:
```text
Test Suites: 11 passed, 11 total
Tests:       51 passed, 51 total
Snapshots:   0 total
Time:        ~2.5 s
Ran all test suites.
```

---

## 📋 Roadmap y Próximas Mejoras

- [ ] Soporte para visualizador de espectro de audio en tiempo real mediante FFT nativo.
- [ ] Soporte para ecualizador de 10 bandas en dispositivos con DSP avanzado.
- [ ] Sincronización P2P local cifrada entre dispositivos en la misma red Wi-Fi (sin servidores externos).
- [ ] Soporte extendido para formatos de audio de alta resolución sin pérdida (FLAC 24-bit / 192kHz y DSD).

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**. Consulta el archivo `LICENSE` para más información.

Desarrollado con dedicación para los amantes de la música, la fidelidad de audio y la soberanía digital. 🎵
