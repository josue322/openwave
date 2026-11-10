# 🌊 OpenWave — Reproductor Musical Offline First (Android)

OpenWave es un reproductor de audio moderno, independiente y de código abierto para Android, desarrollado con **React Native**, **Expo** y **TypeScript**. Diseñado bajo principios de **Clean Architecture**, privacidad total (100% offline, sin publicidad, sin rastreo) y soberanía de datos del usuario.

---

## 🚀 Decisiones Tecnológicas (Stack Obligatorio)

- **Framework:** React Native + Expo (SDK 52+).
- **Lenguaje:** TypeScript (Strict Mode).
- **Navegación:** Expo Router (File-based routing con Tabs y Modales).
- **Gestión de Estado:** Zustand (Stores atómicos desacoplados).
- **Persistencia Local:** Expo SQLite (WAL habilitado, claves foráneas, índices de alta velocidad) y Expo FileSystem.
- **Seguridad:** Expo SecureStore (OAuth 2.0 PKCE para Spotify).
- **Motor de Audio:** `IAudioEngine` con soporte dual (`expo-audio` y módulo nativo `AndroidX Media3 / ExoPlayer`).
- **Diseño & Animaciones:** Estética oscura moderna, Lucide Icons, React Native Reanimated.

---

## 📁 Estructura del Proyecto

```text
OPENWAVE/
├── app/                  # Rutas de Expo Router (Tabs, Modales, Vistas)
│   ├── (tabs)/           # Inicio, Biblioteca, Buscar, Ajustes
│   ├── player/           # Reproductor Completo y Cola
│   └── _layout.tsx       # Root Layout & Inicialización de Base de Datos
├── src/
│   ├── core/             # Base de datos SQLite, Migraciones, Permisos
│   ├── domain/           # Entidades, Casos de uso y Contratos
│   ├── data/             # DAOs, Mappers y Repositorios
│   ├── playback/         # IAudioEngine y gestores de reproducción
│   ├── store/            # Stores Zustand (Player, Library, Settings)
│   ├── components/       # Componentes reutilizables (MiniPlayer, etc.)
│   └── theme/            # Paleta de colores y tipografía
└── tests/                # Pruebas unitarias con Jest
```

---

## 🛠️ Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo Expo
npx expo start

# Compilar para Android localmente
npx expo run:android

# Generar APK con EAS Build
eas build --platform android --profile preview
```

---

## 📜 Licencia

Código abierto bajo licencia MIT.

