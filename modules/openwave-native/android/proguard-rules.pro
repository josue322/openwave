# Keep OpenWave native module, Media3 service, Widget receiver and Google Cast provider classes intact under R8
-keep class expo.modules.openwavenative.** { *; }
-dontwarn com.google.android.gms.cast.**

