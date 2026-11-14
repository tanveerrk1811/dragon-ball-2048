import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Optional release signing: create android/keystore.properties (never commit it):
//   storeFile=/path/to/release.jks
//   storePassword=...
//   keyAlias=...
//   keyPassword=...
val keystoreProps = Properties().apply {
    val f = rootProject.file("keystore.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}

val googleTestAppId = "ca-app-pub-3940256099942544~3347511713"

android {
    namespace = "com.example.dragonball2048"
    compileSdk = 35

    defaultConfig {
        // Google Play rejects com.example.*: change applicationId (and optionally the package) before publishing.
        applicationId = "com.example.dragonball2048"
        minSdk = 23
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
        manifestPlaceholders["admobAppId"] = googleTestAppId
    }

    signingConfigs {
        if (keystoreProps.isNotEmpty()) {
            create("release") {
                storeFile = file(keystoreProps["storeFile"] as String)
                storePassword = keystoreProps["storePassword"] as String
                keyAlias = keystoreProps["keyAlias"] as String
                keyPassword = keystoreProps["keyPassword"] as String
            }
        }
    }

    buildTypes {
        debug {
            manifestPlaceholders["admobAppId"] = googleTestAppId
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            manifestPlaceholders["admobAppId"] = (project.findProperty("ADMOB_APP_ID") as String?) ?: googleTestAppId
            if (keystoreProps.isNotEmpty()) signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { buildConfig = true }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.webkit:webkit:1.12.1")
    // Google Mobile Ads SDK (AdMob). Check the release notes for the newest version:
    // https://developers.google.com/admob/android/rel-notes
    implementation("com.google.android.gms:play-services-ads:23.6.0")
    // Google User Messaging Platform (consent forms for EEA/UK; privacy options entry point)
    implementation("com.google.android.ump:user-messaging-platform:3.1.0")
}
