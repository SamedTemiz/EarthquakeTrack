/**
 * Modal copy for info dialog (About, FAQ, Privacy, Terms).
 * Markup uses .modal-doc* classes; styles in style.css (#modal-text scope).
 */

const ICON_INFO = `<span class="modal-doc__icon" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg></span>`;

const ICON_FAQ = `<span class="modal-doc__icon" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/></svg></span>`;

const ICON_SHIELD = `<span class="modal-doc__icon" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>`;

const ICON_FILE = `<span class="modal-doc__icon" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg></span>`;

export const content = {
    tr: {
        about: `
<div class="modal-doc">
  <header class="modal-doc__header">${ICON_INFO}
    <h2 class="modal-doc__title" id="modal-doc-title">Hakkında</h2>
  </header>
  <p class="modal-doc__lead">EarthquakeTrack, Türkiye ve dünyadaki deprem verilerini anlık olarak takip etmenizi sağlayan, tamamen ücretsiz bir web uygulamasıdır.</p>
  <section class="modal-doc__section" aria-labelledby="about-sources-tr">
    <h3 class="modal-doc__h" id="about-sources-tr">Veri kaynakları</h3>
    <p>Uygulamamız verilerini güvenilir ve halka açık API servislerinden alır:</p>
    <ul class="modal-doc__list">
      <li><strong><a href="https://earthquake.usgs.gov/" target="_blank" rel="noopener noreferrer">USGS</a></strong> (Amerika Birleşik Devletleri Jeoloji Araştırmaları Kurumu): Dünya genelindeki büyük depremler için ana veri kaynağımızdır.</li>
      <li><strong><a href="https://www.emsc-csem.org/" target="_blank" rel="noopener noreferrer">EMSC</a></strong> (Avrupa-Akdeniz Sismoloji Merkezi): Avrupa ve Akdeniz bölgesi için önemli bir kaynaktır.</li>
      <li><strong><a href="http://www.koeri.boun.edu.tr/" target="_blank" rel="noopener noreferrer">Kandilli Rasathanesi</a></strong> ve <strong><a href="https://deprem.afad.gov.tr/" target="_blank" rel="noopener noreferrer">AFAD</a></strong>: Türkiye ve yakın çevre için birincil kaynaklarımızdır.</li>
    </ul>
  </section>
  <section class="modal-doc__section" aria-labelledby="about-mission-tr">
    <h3 class="modal-doc__h" id="about-mission-tr">Amacımız</h3>
    <p>Deprem kuşağında yer alan bir ülke olarak bilgiye hızlı ve doğru ulaşmanın hayati olduğuna inanıyoruz. EarthquakeTrack ile deprem farkındalığını artırmayı ve güncel verileri anlaşılır şekilde sunmayı hedefliyoruz.</p>
  </section>
</div>`,
        faq: `
<div class="modal-doc modal-doc--faq">
  <header class="modal-doc__header">${ICON_FAQ}
    <h2 class="modal-doc__title" id="modal-doc-title">Sıkça sorulan sorular</h2>
  </header>
  <div class="modal-faq">
    <article class="modal-faq__item">
      <h3 class="modal-faq__q">Veriler ne sıklıkla güncelleniyor?</h3>
      <p class="modal-faq__a">Veriler, sismoloji merkezlerinden (USGS, Kandilli vb.) yayınlandığı anda sistemimize düşer. Genellikle deprem olduktan birkaç dakika sonra listede görebilirsiniz.</p>
    </article>
    <article class="modal-faq__item">
      <h3 class="modal-faq__q">Neden bazı depremleri listede göremiyorum?</h3>
      <p class="modal-faq__a">Sistem varsayılan olarak son 24 saatteki ve belirli bir büyüklüğün üzerindeki (genellikle 2.5+) depremleri gösterir. İleri düzey filtreleme seçenekleri gelecek güncellemelerle eklenebilir.</p>
    </article>
    <article class="modal-faq__item">
      <h3 class="modal-faq__q">“Büyüklük” (magnitude) ne anlama geliyor?</h3>
      <p class="modal-faq__a">Depremin açığa çıkardığı enerjinin ölçüsüdür. Logaritmik ölçek olduğu için 6.0 büyüklüğündeki bir deprem, 5.0’a göre yaklaşık 10 kat daha güçlü sarsıntı ve 32 kat daha fazla enerji ile ilişkilendirilir.</p>
    </article>
  </div>
</div>`,
        privacy: `
<div class="modal-doc">
  <header class="modal-doc__header">${ICON_SHIELD}
    <h2 class="modal-doc__title" id="modal-doc-title">Gizlilik politikası</h2>
  </header>
  <p class="modal-doc__meta">Son güncelleme: 12 Şubat 2026</p>
  <section class="modal-doc__section">
    <h3 class="modal-doc__h">1. Toplanan veriler</h3>
    <p>EarthquakeTrack olarak gizliliğinize önem veriyoruz. Sitemizi ziyaret ettiğinizde kişisel verinizi (isim, e-posta, telefon vb.) kaydetmiyoruz. Üyelik sistemi bulunmamaktadır.</p>
  </section>
  <section class="modal-doc__section">
    <h3 class="modal-doc__h">2. Çerezler ve yerel depolama</h3>
    <p>Tarayıcınızın yerel depolaması (ör. tema ve dil tercihi) kullanıcı deneyimi için kullanılabilir. Google AdSense ve benzeri üçüncü taraf hizmetler çerez veya analiz araçları kullanabilir.</p>
  </section>
  <section class="modal-doc__section">
    <h3 class="modal-doc__h">3. Konum bilgisi</h3>
    <p>Haritada konumunuzu göstermek için tarayıcı izni gerekir; bu veri yalnızca cihazınızda işlenir, sunucularımıza kaydedilmez.</p>
  </section>
  <section class="modal-doc__section">
    <h3 class="modal-doc__h">4. Üçüncü taraf bağlantılar</h3>
    <p>Sitedeki dış bağlantıların gizlilik politikalarından sorumlu değiliz.</p>
  </section>
</div>`,
        terms: `
<div class="modal-doc">
  <header class="modal-doc__header">${ICON_FILE}
    <h2 class="modal-doc__title" id="modal-doc-title">Kullanım koşulları</h2>
  </header>
  <p class="modal-doc__lead">Lütfen sitemizi kullanmadan önce bu koşulları okuyun.</p>
  <section class="modal-doc__section">
    <h3 class="modal-doc__h">1. Hizmetin kullanımı</h3>
    <p>EarthquakeTrack yalnızca bilgilendirme amaçlıdır. Deprem tahmini yapmaz ve resmi uyarı sisteminin yerine geçmez. Afet durumlarında AFAD ve yetkili mercilerin duyurularını takip edin.</p>
  </section>
  <section class="modal-doc__section">
    <h3 class="modal-doc__h">2. Sorumluluk reddi</h3>
    <p>Deprem verileri sismoloji merkezlerinden otomatik alınır; doğruluk veya zamanlama garantisi verilemez. Verilerin kullanımından doğan zararlardan EarthquakeTrack sorumlu tutulamaz.</p>
  </section>
  <section class="modal-doc__section">
    <h3 class="modal-doc__h">3. Telif hakları</h3>
    <p>Sitenin tasarımı ve kodları telif ile korunur; izinsiz kopyalanamaz.</p>
  </section>
</div>`
    },
    en: {
        about: `
<div class="modal-doc">
  <header class="modal-doc__header">${ICON_INFO}
    <h2 class="modal-doc__title" id="modal-doc-title">About</h2>
  </header>
  <p class="modal-doc__lead">EarthquakeTrack is a free web application for following earthquake data in Turkey and worldwide in near real time.</p>
  <section class="modal-doc__section" aria-labelledby="about-sources-en">
    <h3 class="modal-doc__h" id="about-sources-en">Data sources</h3>
    <p>We use reliable, publicly available APIs:</p>
    <ul class="modal-doc__list">
      <li><strong><a href="https://earthquake.usgs.gov/" target="_blank" rel="noopener noreferrer">USGS</a></strong> (United States Geological Survey): Primary source for large global earthquakes.</li>
      <li><strong><a href="https://www.emsc-csem.org/" target="_blank" rel="noopener noreferrer">EMSC</a></strong> (European-Mediterranean Seismological Centre): Important for Europe and the Mediterranean.</li>
      <li><strong><a href="http://www.koeri.boun.edu.tr/" target="_blank" rel="noopener noreferrer">Kandilli Observatory</a></strong> and <strong><a href="https://deprem.afad.gov.tr/" target="_blank" rel="noopener noreferrer">AFAD</a></strong>: Primary sources for Turkey and the surrounding region.</li>
    </ul>
  </section>
  <section class="modal-doc__section" aria-labelledby="about-mission-en">
    <h3 class="modal-doc__h" id="about-mission-en">Our mission</h3>
    <p>We believe fast, accurate information matters in earthquake-prone regions. EarthquakeTrack aims to improve awareness and present up-to-date data clearly.</p>
  </section>
</div>`,
        faq: `
<div class="modal-doc modal-doc--faq">
  <header class="modal-doc__header">${ICON_FAQ}
    <h2 class="modal-doc__title" id="modal-doc-title">Frequently asked questions</h2>
  </header>
  <div class="modal-faq">
    <article class="modal-faq__item">
      <h3 class="modal-faq__q">How often is data updated?</h3>
      <p class="modal-faq__a">Data appears as soon as it is published by seismology centers (USGS, Kandilli, etc.). You will usually see events within a few minutes.</p>
    </article>
    <article class="modal-faq__item">
      <h3 class="modal-faq__q">Why are some earthquakes missing from the list?</h3>
      <p class="modal-faq__a">By default we show roughly the last 24 hours and events above a magnitude threshold (often 2.5+). More filtering options may come in future updates.</p>
    </article>
    <article class="modal-faq__item">
      <h3 class="modal-faq__q">What does “magnitude” mean?</h3>
      <p class="modal-faq__a">It measures energy released at the source. Because the scale is logarithmic, a magnitude 6.0 event is associated with about 10× stronger shaking and about 32× more energy than magnitude 5.0.</p>
    </article>
  </div>
</div>`,
        privacy: `
<div class="modal-doc">
  <header class="modal-doc__header">${ICON_SHIELD}
    <h2 class="modal-doc__title" id="modal-doc-title">Privacy policy</h2>
  </header>
  <p class="modal-doc__meta">Last updated: February 12, 2026</p>
  <section class="modal-doc__section">
    <h3 class="modal-doc__h">1. Data we collect</h3>
    <p>We do not collect personal data such as name, email, or phone. There is no account system.</p>
  </section>
  <section class="modal-doc__section">
    <h3 class="modal-doc__h">2. Cookies and local storage</h3>
    <p>Your browser may store preferences (e.g. theme and language). Third-party services such as Google AdSense may use cookies or analytics.</p>
  </section>
  <section class="modal-doc__section">
    <h3 class="modal-doc__h">3. Location</h3>
    <p>Showing your position on the map requires browser permission. That data is processed on your device only and is not saved on our servers.</p>
  </section>
  <section class="modal-doc__section">
    <h3 class="modal-doc__h">4. Third-party links</h3>
    <p>We are not responsible for the privacy practices of external sites linked from EarthquakeTrack.</p>
  </section>
</div>`,
        terms: `
<div class="modal-doc">
  <header class="modal-doc__header">${ICON_FILE}
    <h2 class="modal-doc__title" id="modal-doc-title">Terms of use</h2>
  </header>
  <p class="modal-doc__lead">Please read these terms before using the site.</p>
  <section class="modal-doc__section">
    <h3 class="modal-doc__h">1. Use of the service</h3>
    <p>EarthquakeTrack is for information only. It does not predict earthquakes or replace official warning systems. In emergencies follow AFAD and authorized authorities.</p>
  </section>
  <section class="modal-doc__section">
    <h3 class="modal-doc__h">2. Disclaimer</h3>
    <p>Earthquake data is fetched automatically from seismology centers. We cannot guarantee accuracy or timing. EarthquakeTrack is not liable for damages arising from use of this data.</p>
  </section>
  <section class="modal-doc__section">
    <h3 class="modal-doc__h">3. Copyright</h3>
    <p>Site design and code are protected; copying without permission is not allowed.</p>
  </section>
</div>`
    }
};
