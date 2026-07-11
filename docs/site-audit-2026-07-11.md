# EarthquakeTrack — Site Denetimi ve AdSense Aksiyon Planı

**Tarih:** 11 Temmuz 2026
**Kapsam:** AdSense "Düşük değere sahip içerik" reddi kök neden analizi + deprem verisi sağlığı + genel teknik denetim.
**Referans site:** [earthquaketrack.com](https://earthquaketrack.com) (aynı niş, aynı isim, ABD — reklam/organik trafikle yaşayan olgun bir örnek)

---

## Yönetici Özeti

Reddin nedeni tek başına "içerik azlığı" değil. Sitede **üç yapısal teknik sorun** var ve bunlar Google'ın gözünde siteyi olduğundan çok daha zayıf gösteriyor:

1. **Sitemap'teki ve sayfa içindeki TÜM linkler 307 redirect'e çarpıyor** (canonical karmaşası — Google hangi URL'nin gerçek olduğundan emin olamıyor).
2. **Ana sayfa (sitenin %90 trafiği alacak sayfa) tarayıcıya boş bir uygulama kabuğu olarak görünüyor** — taranabilir metin neredeyse sıfır. Referans site aynı ana sayfada ~2.000+ kelime indexlenebilir içerik sunuyor.
3. **CSP (Content-Security-Policy) başlığı Google Fonts'u şu anda, AdSense reklam iframe'lerini ise onay sonrasında engelleyecek şekilde yanlış** — onay gelse bile reklam render edilemezdi.

Bunlara ek olarak deprem verisi tarafında **2 gerçek bug** tespit edildi (saat dilimi kayması + kaynak arızasında veri boşluğu).

---

## A. AdSense Reddi — Kök Nedenler (öncelik sırasıyla)

### A1. 🔴 P0 — Tüm URL'ler redirect: canonical/sitemap/iç link tutarsızlığı

**Ölçülen davranış (canlı site, 11 Tem 2026):**

| İstek | Sonuç |
|---|---|
| `/` | 200 ✓ |
| `/index.html` | **307 →** `/` |
| `/blog.html` | **307 →** `/blog` |
| `/blog/deprem-sonrasi-ilk-24-saat.html` | **307 →** `/blog/deprem-sonrasi-ilk-24-saat` |
| `https://www.earthquaketrack.com.tr/` | **522** (site tamamen erişilemez) |

Cloudflare Pages `.html` uzantılarını otomatik olarak uzantısız URL'lere yönlendiriyor. Ancak:

- `sitemap.xml`'deki 17 URL'nin 16'sı `.html` ile bitiyor → **sitemap'teki her URL bir redirect**. Google, redirect veren sitemap URL'lerini "kanonik değil" olarak işaretler.
- Her sayfanın `<link rel="canonical">` etiketi `.html`'li URL'yi gösteriyor → **canonical'ın kendisi redirect'e gidiyor**. Google bu durumda canonical'ı yok sayıp kendi kanonik seçimini yapar; sinyaller bölünür.
- Sidebar/iç linklerin tamamı `.html`'li → her tıklama gereksiz bir redirect. 307 "geçici" redirect olduğu için Google hedefe otorite aktarmakta da isteksizdir.

**Çözüm (tek seferlik, ~2 saat):** Sitenin tek gerçek URL biçimine karar ver: **uzantısız** (Cloudflare'in zaten zorladığı biçim). Sonra üç yerde senkronize et:
1. `public/sitemap.xml` → tüm `loc` değerlerinden `.html` kaldır.
2. Tüm `canonical`, `og:url` değerleri (`src/pages/*.astro`, `src/pages/blog/*.astro`, `public/index.html`) → uzantısız.
3. Tüm iç linkler (`PageLayout.astro` sidebar, `public/index.html` sidebar, blog related-posts linkleri, `blog.astro` kart linkleri) → uzantısız (`/blog`, `/blog/deprem-sonrasi-ilk-24-saat`, ana sayfa için `/`).
4. Search Console'da sitemap'i yeniden gönder.

> Not: `format: 'file'` build çıktısı değişmek zorunda değil — Cloudflare `blog.html` dosyasını `/blog` URL'sinde zaten servis ediyor. Sadece *referanslar* uzantısız olmalı.

### A2. 🔴 P0 — Ana sayfa Google'a "boş" görünüyor

`public/index.html`'in gövdesi: sidebar nav etiketleri + boş `<div id="earthquake-list">` + boş `<div id="map">`. Deprem listesi, istatistik, açıklama — hepsi JS ile sonradan doluyor. AdSense insan denetçisi ve kalite tarayıcısı ana sayfada **değer üreten metin göremiyor**. "Düşük değere sahip içerik" kararının en büyük tetikleyicisi büyük olasılıkla bu.

**Referans karşılaştırma (earthquaketrack.com ana sayfası):**

| Özellik | earthquaketrack.com | Biz |
|---|---|---|
| Ana sayfada taranabilir metin | ~2.000+ kelime (son 26 deprem listesi metin olarak, istatistikler: "son 24 saatte 117 deprem") | ~0 kelime |
| Deprem başına detay sayfası | Var (`/quakes/2026-07-11-...`) — her deprem ayrı indexlenebilir URL | Yok |
| Bölge/şehir sayfaları | Var (`/p/japan/recent`, ülke→bölge→şehir hiyerarşisi) | Yok |
| Blog/rehber içerik | Az | Var ve kaliteli (9 yazı) ✓ |

**Çözüm — kademeli:**
1. **Hızlı (1 gün):** Ana sayfaya, haritanın altına statik/SSG bir metin bölümü ekle: "EarthquakeTrack nedir, veriler nereden gelir (Kandilli/AFAD/USGS/EMSC), büyüklük ölçekleri ne anlama gelir" + son depremler için `<noscript>` fallback açıklaması. 300–500 kelime yeterli.
2. **Orta (1 hafta):** Build sırasında veya bir Cloudflare Function ile **son depremleri HTML'e göm** (ilk render'da liste dolu gelsin; JS sonra canlı güncellesin). Hem SEO hem LCP/UX kazancı.
3. **Stratejik (2–4 hafta):** Bölge sayfaları üret: `/bolge/istanbul`, `/bolge/ege`, `/bolge/dogu-anadolu`… Her sayfada o bölgenin fay hatları, tarihsel depremleri (statik metin) + canlı bölge listesi. Bu, referans sitenin trafiğinin ana kaynağı olan "istanbul son depremler" tipi long-tail aramaları yakalar. 10–15 bölge sayfası, indexlenebilir sayfa sayısını ~2 katına çıkarır.

### A3. 🔴 P0 — CSP başlığı Google Fonts'u ve AdSense'i engelliyor

Canlı sitede doğrulandı — `public/_headers` içindeki CSP:

- `style-src 'self' 'unsafe-inline'` → `fonts.googleapis.com` stylesheet'i **şu anda bloklanıyor**. Site herkese fallback (sistem) fontuyla açılıyor, konsol CSP hatalarıyla dolu. (Kalite denetçisinin gördüğü sayfa, tasarladığınız sayfa değil.)
- `font-src 'self'` → `fonts.gstatic.com` bloklanır.
- `frame-src` tanımsız → `default-src 'self'` devreye girer → **AdSense reklam iframe'leri (`googleads.g.doubleclick.net`, `tpc.googlesyndication.com`) bloklanır.** Onay gelse bile reklam çıkmaz; AdSense tarayıcısı reklam yerleşimini doğrulayamaz.
- `connect-src`'de AdSense'in ihtiyaç duyduğu `pagead2.googlesyndication.com` vb. yok.

**Çözüm — `public/_headers` CSP'yi güncelle:**

```
Content-Security-Policy: default-src 'self';
  script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://*.adtrafficquality.google https://www.googletagmanager.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://*.adtrafficquality.google;
  connect-src 'self' https://earthquake.usgs.gov https://api.orhanaydogdu.com.tr https://www.seismicportal.eu https://nominatim.openstreetmap.org https://ipapi.co https://pagead2.googlesyndication.com https://*.adtrafficquality.google https://*.basemaps.cartocdn.com;
  frame-ancestors 'none';
```
(Tek satıra indirilmeli; `gnews.io` ve `newsdata.io` artık kullanılmıyor — haberler `/api/news` üzerinden geliyor — temizlendi.)

### A4. 🟠 P1 — www alt alan adı ölü (522)

`www.earthquaketrack.com.tr` Cloudflare 522 veriyor. DNS kaydı var ama Pages projesine bağlı değil. Kullanıcı kaybı + güven sinyali. **Çözüm:** Cloudflare Pages → Custom domains'e `www` ekle **veya** Bulk Redirect ile `www` → apex 301 kuralı tanımla.

### A5. 🟠 P1 — E-E-A-T eksikleri: yazar yok, makale şeması yok, tarih makine-okunur değil

- Blog yazılarında **yazar adı/biyografisi yok** — YMYL-komşusu bir konuda (afet güvenliği) Google yazarsız içeriğe karşı katı.
- Sitede **hiçbir sayfada** `Article`/`BlogPosting`/`FAQPage` JSON-LD yok (tek şema: ana sayfadaki `WebApplication`).
- Tarihler yalnızca görünür metin ("13 Haziran 2026"); `datePublished`/`dateModified` yok, `<time datetime>` bile yok.
- Yazıların **hiçbirinde görsel yok** (yalnızca inline SVG ikonlar); `og:image` tüm sitede tek generic görsel.

**Çözüm:** `ArticleShell.astro`'ya props'tan beslenen bir `BlogPosting` JSON-LD bloğu ekle (`headline`, `datePublished`, `dateModified`, `author` → `about.html`'e bağlanan gerçek kişi/marka, `image`). `faq.astro`'ya `FAQPage` şeması. Blog başına 1 kapak görseli (og:image olarak da kullanılır). About sayfasına "Bu siteyi kim yapıyor" bölümü + iletişim bağlantısı.

### A6. 🟠 P1 — Aynı URL'de gizli ikinci dil (display:none EN kopyası)

Her içerik sayfası, İngilizce çevirinin tamamını `<div id="content-en" style="display:none">` içinde taşıyor. Google gizli metni indexler ama değerini düşürür; sayfa yarı TR yarı EN sinyali verir; hreflang yok. AdSense kalite denetiminde "kopya/şişirilmiş DOM" olarak da okunabilir.

**Çözüm (orta vade):** EN içerikleri `/en/...` altında ayrı sayfalara taşı + `hreflang="tr"`/`hreflang="en"` karşılıklı etiketler. Kısa vadede en azından ana sayfa `<html lang>` ile görünür içeriğin dili tutarlı kalmalı. Bu, indexlenebilir sayfa sayısını da ikiye katlar (17 → ~34).

### A7. 🟡 P2 — İçerik hacmi ve tazeliği

9 blog + 4 bilgi sayfası iyi bir çekirdek ama AdSense "minimum içerik" eşiğinin sınırında. Son içerik 24 Haziran tarihli. **Hedef:** yeniden inceleme istemeden önce 2–3 hafta boyunca haftada 1–2 yeni özgün yazı (öneri kuyruğu: "Deprem sigortası DASK rehberi", "İstanbul depremi senaryoları: bilim ne diyor", "Erken uyarı sistemleri nasıl çalışır", "Asansörde/metroda deprem", "Kira ve hasar tespiti: hukuki adımlar") + A2'deki bölge sayfaları.

### A8. 🟡 P2 — Küçük SEO/teknik notlar

- Haber sekmesi Google News RSS aggregation'ı yalnızca JS ile geliyor → indexlenmiyor; AdSense açısından risk düşük. **Bu başlıkları asla statik sayfaya dönüştürmeyin** (scraped content sayılır).
- Ana sayfa şeması `WebApplication` yalnız; `WebSite` + `Organization` şeması ekle (logo, sameAs).
- Analytics kurulu değil (CSP'de `googletagmanager` izni var ama script yok). Yeniden başvuru öncesi GA4 kur — gerçek kullanıcı sinyali AdSense değerlendirmesine dolaylı katkı sağlar.
- `robots.txt` ve `ads.txt` doğru ✓. Sitemap Search Console'da başarılı okunuyor ✓ (ama A1'deki redirect sorunu yüzünden "Keşfedilen 18 sayfa"nın indexe dönüşümü zayıf kalacaktır — Sayfalar raporundaki "Yönlendirmeli sayfa" sayısını kontrol edin).
- Anthropic/genel bot fetcher'ına 403 dönüyor (Cloudflare bot koruması). Googlebot ve Mediapartners-Google UA'ları 200 alıyor ✓ — yine de Cloudflare Security → Events ekranında `Mediapartners-Google` veya `AdsBot-Google` engellenmiş mi kontrol edin; Bot Fight Mode açıksa "Verified bots: Allow" olduğundan emin olun.

---

## B. Deprem Verisi Sağlığı — Buglar ve Riskler

### B1. 🔴 Bug — Kandilli saatleri yanlış saat diliminde parse ediliyor

[api.js:72-81](public/js/api.js#L72) `parseKandilliDate`, `"2026.07.11 15:10:45"` biçimindeki tarihi `new Date(y, m, d, ...)` ile **kullanıcının yerel saatinde** kuruyor. Kandilli saati Türkiye saatidir (UTC+3). Sonuç: Türkiye dışındaki her ziyaretçi (ve TR dışı saat dilimindeki her cihaz) için "X dk önce" değerleri saat farkı kadar kayıyor; Almanya'daki kullanıcı 5 dakikalık depremi "2 saat önce" görüyor. Sıralama da USGS/EMSC (UTC epoch) kayıtlarına göre bozuluyor.

**Çözüm:** `Date.UTC(y, m-1, d, h, min, s) - 3*3600*1000` olarak kur.

### B2. 🔴 Bug — EMSC arızasında Avrupa/Türkiye verisi tamamen kayboluyor

[api.js:155-161](public/js/api.js#L155): USGS depremleri, EMSC bounding box'ı (30–72K, -25–50D) içindeyse **her koşulda** atılıyor — EMSC isteği başarısız olsa bile. Kandilli + EMSC aynı anda düşerse (ikisi de üçüncü parti/ücretsiz servis), USGS elimizde olduğu halde Türkiye ve tüm Avrupa haritada boş görünür. "Deprem verilerini sağlıklı gösterme" hedefinin en kritik kırılganlığı bu.

**Çözüm:** Filtreyi koşula bağla: `emscPoints.length > 0` ise USGS'i bölge içinde ele; değilse USGS'in tamamını kullan. (Türkiye için aynı mantık Kandilli'ye.)

### B3. 🟠 Risk — Türkiye verisi tek gayriresmî API'ye bağlı

Kandilli verisi `api.orhanaydogdu.com.tr` (kişisel/üçüncü parti proje) üzerinden geliyor. Bu API geçmişte kesintiler yaşadı; SLA yok. **Öneri:** AFAD'ın resmî event servisini (`deprem.afad.gov.tr/apiv2/event/filter`) ikinci Türkiye kaynağı olarak ekle; sıralama Kandilli → AFAD → EMSC olsun. (CSP `connect-src`'ye eklemeyi unutma.)

### B4. 🟡 Temizlik — api.js'te ölü kod

[api.js:164-168](public/js/api.js#L164): `return finalEarthquakes;` iki kez, ikincisi erişilemez. Kaldır.

### B5. 🟡 Not — Nominatim kullanım koşulları

Reverse geocoding doğrudan tarayıcıdan `nominatim.openstreetmap.org`'a gidiyor. Nominatim politikası tanımlayıcı bir User-Agent/Referer ister ve ağır kullanımda IP bazlı bloklar. Trafik büyüyünce bu çağrıyı kendi `/api/geocode` fonksiyonun arkasına al (5 dk cache ile).

---

## C. Önerilen Yol Haritası

**Hafta 1 — Teknik temizlik (yeniden başvurunun ön koşulu):**
1. A1: URL/canonical/sitemap uzantısız birleştirme + Search Console'a yeniden sitemap.
2. A3: CSP düzeltmesi (fonts + AdSense frame'leri).
3. A4: www → apex.
4. B1 + B2 + B4: veri bugları.
5. A5'in hızlı kısmı: BlogPosting + FAQPage JSON-LD, `<time datetime>`, yazar satırı.

**Hafta 2–3 — İçerik derinliği:**
6. A2: Ana sayfaya statik açıklama bölümü + son depremlerin HTML'e gömülmesi.
7. 3–4 yeni blog yazısı + mevcut yazılara birer kapak görseli.
8. İlk 5 bölge sayfası (İstanbul, İzmir/Ege, Doğu Anadolu, Marmara, Akdeniz).
9. GA4 kurulumu.

**Hafta 4 — Yeniden başvuru:**
10. Search Console → Sayfalar raporunda redirect/duplicate uyarılarının eridiğini doğrula.
11. AdSense "İnceleme iste". (Erken basmayın — düzeltmeler indexlenmeden istenen inceleme, art arda red riskini büyütür; her red bir sonraki incelemeyi zorlaştırır.)

---

## D. Bu Denetimde Doğrulanamayanlar / Sizin Kontrol Etmeniz Gerekenler

- Cloudflare Security Events'te AdSense tarayıcısının (Mediapartners-Google) engellenip engellenmediği (panel erişimi gerekli).
- Search Console → Sayfalar raporundaki fiili index/redirect dağılımı (ekran görüntüsünde yalnızca sitemap durumu vardı).
- AdSense hesabında site URL'sinin `www`'suz kayıtlı olduğu.
