# 🛠️ GUÍA DE COMPILACIÓN Y DISTRIBUCIÓN — OPENWAVE (ANDROID)

Esta guía documenta los métodos oficiales para ejecutar, probar y compilar **OpenWave** en dispositivos Android.

---

## 1. Requisitos Previos

- **Node.js:** v24.x o v20.x LTS.
- **Java:** JDK 17 (`JAVA_HOME` configurado).
- **Android SDK:** Platform-tools y build-tools (`ANDROID_HOME` configurado).
- **Git:** Instalado y configurado.

---

## 2. Desarrollo Local Rápido (Expo Go)

Ideal para probar la interfaz, la base de datos SQLite, el ecualizador y las listas en tu teléfono Android:

```bash
# Iniciar el servidor Metro
npx expo start
```

1. Descarga la aplicación gratuita **Expo Go** desde Google Play Store en tu teléfono Android.
2. Abre la cámara o la app Expo Go y escanea el código QR que aparece en tu terminal.
3. La aplicación se cargará al instante con recarga en caliente (Fast Refresh).

---

## 3. Generación de APK Instalable Independiente (EAS Build)

Para obtener un archivo `.apk` final que cualquier usuario puede instalar directamente sin depender de Expo Go ni de Google Play:

### Paso 1: Instalar EAS CLI (si no lo tienes)
```bash
npm install -g eas-cli
```

### Paso 2: Iniciar sesión en Expo
```bash
eas login
```

### Paso 3: Configurar el proyecto en EAS
```bash
eas build:configure
```

### Paso 4: Compilar el APK de Android
```bash
eas build --platform android --profile preview
```

> **Nota:** El perfil `preview` está preconfigurado en `eas.json` con `"buildType": "apk"`. Al finalizar la compilación en la nube, EAS te entregará un enlace directo de descarga y un código QR para bajar el APK a tu teléfono.

---

## 4. Compilación Nativa Local (Offline con Android SDK y Gradle)

Si prefieres compilar el APK completamente en tu computadora usando el SDK de Android local:

```bash
# 1. Generar la carpeta nativa android/
npx expo prebuild --platform android

# 2. Compilar e instalar directamente en tu emulador o teléfono conectado por USB
npx expo run:android --variant release
```

El APK resultante se generará en:
`android/app/build/outputs/apk/release/app-release.apk`

---

## 5. Instalación manual vía ADB

Si tienes tu teléfono Android conectado por cable USB con depuración habilitada:

```bash
# Verificar dispositivo conectado
adb devices

# Instalar el APK
adb install -r openwave.apk
```
