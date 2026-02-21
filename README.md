# 🕌 Kaza Namazı Takip

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-c9a84c?style=for-the-badge)
![Platform](https://img.shields.io/badge/platform-Android%20%7C%20PWA-4ecdc4?style=for-the-badge)
![Expo](https://img.shields.io/badge/Expo-51-000020?style=for-the-badge&logo=expo)
![React Native](https://img.shields.io/badge/React%20Native-0.74-61dafb?style=for-the-badge&logo=react)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

**Kılınamamış namazlarınızı takip edin. Konum bazlı namaz vakitleri. Vakit uyarıları.**

[📱 APK Kurulum](#-apk-kurulum) • [🌐 PWA Kullan](#-pwa-web-uygulaması) • [🚀 Geliştirme](#-geliştirme)

</div>

---

## ✨ Özellikler

- **📊 Kaza Hesaplama** — Yıl sayısı ve cinsiyet bilgisine göre otomatik hesaplama
- **🕌 6 Vakit Takibi** — Sabah, Öğle, İkindi, Akşam, Yatsı ve Vitir (erkek)
- **➕➖ Kolay Güncelleme** — Her vakit için artır/azalt butonu
- **📍 Konum Bazlı Vakitler** — IP üzerinden otomatik konum, Aladhan API ile Diyanet/Hanefî hesabı
- **🔔 Vakit Uyarıları** — Uygulama açıkken vakit girişinde ekran uyarısı
- **♀️ Kadın/Erkek Modu** — Kadın için hayız günleri (~14 gün/yıl) ve Vitir farkı
- **💾 Kalıcı Veri** — AsyncStorage ile veriler uygulama kapansa da korunur
- **🌐 PWA Desteği** — Ana ekrana eklenebilir web uygulaması, offline çalışır

---

## 🗂️ Proje Yapısı

```
kaza-namaz-takip/
│
├── android/                        # Android native kaynak dosyaları
│   └── app/src/main/res/
│       ├── values/colors.xml       # Splash ekran rengi tanımı
│       └── drawable/splashscreen.xml
│
├── pwa/                            # Progressive Web App
│   ├── index.html                  # Tek sayfalık uygulama (vanilla JS)
│   ├── manifest.json               # PWA manifest (ana ekrana ekleme)
│   └── sw.js                       # Service Worker (offline + bildirim)
│
├── App.tsx                         # Ana React Native uygulama bileşeni
├── index.js                        # Uygulama giriş noktası
├── app.json                        # Expo konfigürasyonu
├── eas.json                        # EAS Build konfigürasyonu
├── babel.config.js                 # Babel transpiler ayarları
├── tsconfig.json                   # TypeScript ayarları
├── package.json                    # Bağımlılıklar
└── README.md
```

---

## 📱 APK Kurulum

### Hazır APK
[Releases](../../releases) sayfasından en güncel APK'yı indirin.

### Kurulum Adımları
1. APK dosyasını Android telefonunuza indirin
2. **Ayarlar → Güvenlik → Bilinmeyen kaynaklar** iznini açın
3. İndirilen APK'yı açıp **Yükle** deyin

> Android 8+ sürümlerde izin, sistem geneli değil uygulama bazlı sorulur.

---

## 🌐 PWA (Web Uygulaması)

`pwa/` klasöründeki dosyaları herhangi bir statik sunucuya yükleyin.

### Netlify / Vercel (önerilen)
```bash
# Netlify
netlify deploy --dir=pwa --prod

# Vercel
vercel pwa
```

### Lokal Test
```bash
cd pwa
npx serve .
# → http://localhost:3000
```

### Android'e Ana Ekrana Eklemek
1. Chrome ile uygulamayı açın
2. Sağ üst menü → **"Ana ekrana ekle"**
3. Tam ekran uygulama gibi çalışır

---

## 🚀 Geliştirme

### Gereksinimler
- Node.js 18+
- npm veya yarn
- [Expo Go](https://expo.dev/go) (test için)

### Kurulum
```bash
git clone https://github.com/kullanici-adi/kaza-namaz-takip.git
cd kaza-namaz-takip

npm install
```

### Expo Go ile Test
```bash
npx expo start --clear
```
Terminalde çıkan QR kodu Expo Go uygulamasıyla okutun.

> ⚠️ **Not:** `expo-location` ve `expo-notifications` paketleri Android emülatörde
> `SecurityException` hatasına yol açtığından bu projede kullanılmamıştır.
> Konum için `ip-api.com`, bildirimler için `setTimeout + Alert` kullanılmaktadır.

---

## 🏗️ APK Build (EAS)

```bash
# EAS CLI kurulumu (bir kez)
npm install -g eas-cli

# Expo hesabına giriş
eas login

# APK build (~10-15 dakika, Expo bulutunda)
eas build --platform android --profile preview
```

Build tamamlandığında [expo.dev](https://expo.dev) hesabınızdan APK'yı indirebilirsiniz.

---

## 🧮 Hesaplama Mantığı

| Cinsiyet | Günlük Vakit | Yıllık Gün | Vitir |
|:---:|:---:|:---:|:---:|
| Erkek | 5 | 365 | ✅ Dahil |
| Kadın | 5 | ~351 (14 gün hayız) | ❌ Dahil değil |

**➖ (Azalt):** Kaza namazı kılındı, sayaç bir düşer  
**➕ (Artır):** Hesaba eklenmesi gereken ek kaza var

---

## 🛠️ Kullanılan Teknolojiler

### React Native Bağımlılıkları
| Paket | Versiyon | Kullanım |
|---|---|---|
| `expo` | ~51.0.0 | Temel framework |
| `expo-linear-gradient` | ~13.0.2 | Gradient butonlar |
| `@expo-google-fonts/amiri` | ^0.2.3 | Arapça font |
| `@react-native-async-storage/async-storage` | 1.23.1 | Veri kalıcılığı |

### PWA
| Teknoloji | Kullanım |
|---|---|
| Vanilla JS | Uygulama mantığı |
| Service Worker | Offline destek |
| Web Notifications API | Vakit bildirimleri |
| LocalStorage | Veri kalıcılığı |

### Harici API'ler
| API | Kullanım |
|---|---|
| [Aladhan API](https://aladhan.com/prayer-times-api) | Namaz vakitleri (Diyanet/Hanefî metodu) |
| [ip-api.com](http://ip-api.com) | IP bazlı konum (izin gerektirmez) |

---

## 🤝 Katkı

Pull request ve issue'lar memnuniyetle karşılanır.

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/yeni-ozellik`)
3. Commit edin (`git commit -m 'feat: yeni özellik eklendi'`)
4. Push edin (`git push origin feature/yeni-ozellik`)
5. Pull Request açın

---

## 📄 Lisans

MIT © 2025

---

<div align="center">

**بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيمِ**

*"Namazı dosdoğru kılın."* — Bakara 2:43

</div>
