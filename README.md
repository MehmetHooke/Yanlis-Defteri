# Yanlis Defteri

Yanlis Defteri, ogrencilerin yanlis yaptigi sorulari ders ve konu bazinda arsivleyip daha sonra tekrar edebilmesi icin gelistirilmis bir mobil uygulamadir. Uygulama Expo + React Native uzerine kuruludur; kullanici girisi, veri saklama, gorsel yukleme ve tekrar/test mantigi icin Firebase kullanir.

Bu proje; soru ekleme, soru cozumlerini kaydetme, performansa gore akilli testler olusturma, tema secimi ve gunluk hatirlatma gibi ozellikler sunar.

## Ozellikler

- Firebase Authentication ile kayit olma ve giris yapma
- Ilk acilista onboarding akisi
- Ders > konu > soru hiyerarsisi ile kisisel soru arsivi
- Foto veya metin tabanli soru ekleme
- 3'e kadar cozum karti ekleyebilme:
  - sik bazli cozum
  - gorsel cozum
  - metin cozum
- Firebase Storage uzerine gorsel yukleme
- Sorulari duzenleme, yeniden siniflandirma ve silme
- Acik / koyu / sistem temasi destegi
- Gunluk tekrar icin yerel bildirim planlama
- Kullanim verisine gore kisisellesen test modlari

## Test Modlari

Uygulamada soru davranislarina gore olusan 4 farkli test modu bulunur:

1. Zayif Nokta Testi
   En cok `cozemedim` isaretlenen sorulari one cikarir.

2. Karma Tekrar
   Zayif, orta ve guclu sorulari karisik getirerek toparlayici bir tekrar akisi sunar.

3. Kalicilik Kontrolu
   Daha once cozulmus ve uzerinden belli bir sure gecmis sorulari tekrar ettirir.

4. Test Sinavi
   Dogru sikki tanimlanmis secmeli sorulardan 5 soruluk mini sinav olusturur.

Bu modlar, soru bazinda tutulan `solvedCount`, `unsolvedCount`, `lastResult` ve `lastAttemptAt` gibi metrikleri kullanir.

## Teknoloji Yigini

- Expo
- React Native
- TypeScript
- Expo Router
- Firebase Auth
- Cloud Firestore
- Firebase Storage
- Expo Notifications
- Expo Image Picker
- NativeWind
- React Native Reanimated
- Lucide React Native

## Proje Yapisi

```text
app/
  (auth)/          Giris ve kayit ekranlari
  (tabs)/          Ana sekmeler: anasayfa, sorular, ekleme, ayarlar
  (test)/          Test modlari ve sonuc ekranlari
  onboarding/      Ilk kullanim akisi
src/
  components/      Ortak UI bilesenleri
  context/         Tema ve uygulama baglamlari
  lib/             Firebase kurulumu
  services/        Auth, soru, test, bildirim, attempt servisleri
  types/           TypeScript veri tipleri
assets/
  images/          Uygulama gorselleri
```

## Veri Modeli

Firestore tarafinda temel yapi kullanici bazlidir:

```text
users/{userId}
  lessons/{lessonId}
    topics/{topicId}
      questions/{questionId}
  attempts/{attemptId}
```

Soru dokumanlari; soru govdesi, cozum kartlari ve test metriklerini bir arada tutar. Gorsel kullanan sorular ve cevaplar Firebase Storage'a yuklenir, Firestore'da ise URL ve path bilgileri saklanir.

## Kurulum

### Gereksinimler

- Node.js
- npm
- Expo CLI kullanimi icin Expo ekosistemi
- Firebase projesi

### Adimlar

1. Depoyu klonlayin:

```bash
git clone <repo-url>
cd yanlis-defteri
```

2. Bagimliliklari kurun:

```bash
npm install
```

3. Kendi `.env` dosyanizi olusturun ve Firebase degiskenlerini ekleyin:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

4. Uygulamayi baslatin:

```bash
npm run start
```

Platform bazli komutlar:

```bash
npm run android
npm run ios
npm run web
```

## Bildirimler

Uygulama, gunluk tekrar hatirlatmasi icin `expo-notifications` kullanir. Ayarlar ekranindan:

- bildirimler acilip kapatilabilir
- saat secilebilir
- mevcut planlanmis bildirim iptal edilebilir

Android tarafinda ayrica bir bildirim kanali tanimlanmistir.

## Tema Sistemi

Tema tercihleri hem cihazda hem de kullanici dokumaninda saklanir:

- `system`
- `light`
- `dark`

Boylece kullanici farkli cihazlarda da tercihine daha yakin bir deneyim alir.

## Kullanilan NPM Scriptleri

```bash
npm run start
npm run android
npm run ios
npm run web
npm run lint
npm run reset-project
```

## Gelistirme Notlari

- Routing yapisi `expo-router` ile dosya tabanli olarak kurulmustur.
- Kimlik dogrulama durumu acilis ekraninda kontrol edilerek uygun akisa yonlendirme yapilir.
- Soru silme islemlerinde bagli attempt kayitlari ve Storage dosyalari da temizlenir.
- Test sistemi, kullanicinin soru gecmisine gore zamanla daha anlamli hale gelir.

## Durum

Bu proje aktif gelistirme altindadir. Kod tabaninda hem urun mantigi hem de arayuz iyilestirmeleri devam etmektedir.
