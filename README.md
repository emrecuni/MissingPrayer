# Kaza Namazı Takip Uygulaması

Kılınamamış namazları takip etmek, namaz vakitlerini konumdan almak ve bildirim almak için geliştirilmiş uygulama.

---

## 📱 1. PWA (Web Uygulaması) — Hemen Kullanın

### Nasıl Çalıştırılır?
Dosyaları bir web sunucusuna yükleyin (GitHub Pages, Netlify, Vercel vb.)

**Lokal test için:**
```bash
cd kaza-namaz-pwa
npx serve .
# veya
python3 -m http.server 8080
```

### Android'e Ana Ekrana Eklemek:
1. Chrome ile uygulamayı açın
2. Sağ üst köşe → "Ana ekrana ekle"
3. Artık ikon olarak görünür ve tam ekran çalışır

### Özellikler:
- ✅ İlk girişte yıl sayısı ve cinsiyet
- ✅ Sabah, Öğle, İkindi, Akşam, Yatsı, Vitir kaza sayısı
- ✅ + / − ile artırma/azaltma
- ✅ Konum bazlı namaz vakitleri (Aladhan API, Hanefî metodu)
- ✅ Tarayıcı bildirimleri (vakit girince otomatik bildirim)
- ✅ Service Worker ile offline çalışma
- ✅ LocalStorage ile veri kalıcılığı
- ✅ Kadın/Erkek hesabı (hayız günleri, vitr)

---

## 🚀 2. React Native / Expo — Android APK

### Gereksinimler:
- Node.js 18+
- Expo CLI: `npm install -g expo-cli eas-cli`
- Expo hesabı (ücretsiz): https://expo.dev

### Kurulum:
```bash
cd kaza-namaz-rn
npm install
```

### Lokal Test (Expo Go ile):
```bash
npx expo start
```
Ardından Android telefonunuzda **Expo Go** uygulamasını açıp QR kodu okutun.

### APK Build (EAS):
```bash
# Giriş yapın
eas login

# Build konfigürasyonu oluşturun
eas build:configure

# APK build (ücretsiz, ~10-15 dakika)
eas build --platform android --profile preview
```

Build tamamlandığında Expo Dashboard'dan APK'yı indirip Android'e yükleyebilirsiniz.

### Google Play'e Yüklemek:
```bash
eas build --platform android --profile production
eas submit --platform android
```

---

## 🕌 Namaz Vakti Kaynağı

**Aladhan API** (ücretsiz, kayıt gerektirmez)
- URL: `https://api.aladhan.com/v1/timings`
- Metod: 13 (Diyanet İşleri Başkanlığı)
- Mezhep: Hanefî (school=1)

---

## 🔔 Bildirim Mantığı

Her gün uygulama açıldığında o günün namaz vakitleri alınır.  
Her vakit için o vakite zamanlanmış bir bildirim oluşturulur:
> "🕌 Sabah Vakti – 06:12 — Kaza Sabah namazınızı kılmayı unutmayın!"

---

## 📊 Hesaplama Mantığı

| Cinsiyet | Günlük namaz | Yıllık gün |
|----------|-------------|-----------|
| Erkek    | 5 vakit + Vitir | 365 gün |
| Kadın    | 5 vakit (Vitir yok) | ~351 gün (14 gün hayız) |

**Azaltma (−):** Kaza namazı kılındı, sayaç düşer  
**Artırma (+):** Hatalı girilmiş veya eklenmesi gereken kaza var

---

## 🛠 Teknolojiler

**PWA:** Vanilla HTML/CSS/JS, Service Worker, Web Notifications API  
**React Native:** Expo 50, expo-location, expo-notifications, AsyncStorage, expo-linear-gradient
