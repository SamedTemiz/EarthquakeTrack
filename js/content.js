export const content = {
    tr: {
        about: `
            <h2>Hakkında</h2>
            <p>EarthquakeTrack, Türkiye ve dünyadaki deprem verilerini anlık olarak takip etmenizi sağlayan, tamamen ücretsiz bir web uygulamasıdır.</p>
            
            <h3>Veri Kaynakları</h3>
            <p>Uygulamamız, verilerini güvenilir ve halka açık API servislerinden almaktadır:</p>
            <ul>
                <li><strong><a href="https://earthquake.usgs.gov/" target="_blank" rel="noopener noreferrer">USGS</a> (Amerika Birleşik Devletleri Jeoloji Araştırmaları Kurumu):</strong> Dünya genelindeki büyük depremler için ana veri kaynağımızdır.</li>
                <li><strong><a href="https://www.emsc-csem.org/" target="_blank" rel="noopener noreferrer">EMSC</a> (Avrupa-Akdeniz Sismoloji Merkezi):</strong> Avrupa ve Akdeniz bölgesindeki deprem verileri için kullandığımız önemli bir kaynaktır.</li>
                <li><strong><a href="http://www.koeri.boun.edu.tr/" target="_blank" rel="noopener noreferrer">Kandilli Rasathanesi</a> ve <a href="https://deprem.afad.gov.tr/" target="_blank" rel="noopener noreferrer">AFAD</a>:</strong> Türkiye ve yakın çevresindeki depremler için birincil kaynaklarımızdır.</li>
            </ul>

            <h3>Amacımız</h3>
            <p>Deprem kuşağında yer alan bir ülke olarak, bilgiye hızlı ve doğru ulaşmanın hayati önem taşıdığına inanıyoruz. EarthquakeTrack ile deprem farkındalığını artırmayı ve kullanıcılarımıza en güncel verileri en anlaşılır şekilde sunmayı hedefliyoruz.</p>
        `,
        faq: `
            <h2>Sıkça Sorulan Sorular (SSS)</h2>
            
            <h3>Veriler ne sıklıkla güncelleniyor?</h3>
            <p>Veriler, sismoloji merkezlerinden (USGS, Kandilli vb.) yayınlandığı anda sistemimize düşer. Genellikle deprem olduktan birkaç dakika sonra listede görebilirsiniz.</p>

            <h3>Neden bazı depremleri listede göremiyorum?</h3>
            <p>Sistemimiz varsayılan olarak son 24 saatteki ve belirli bir büyüklüğün üzerindeki (genellikle 2.5+) depremleri gösterir. Filtreleme seçenekleri gelecekteki güncellemelerle eklenecektir.</p>

            <h3>"Büyüklük" (Magnitude) ne anlama geliyor?</h3>
            <p>Depremin açığa çıkardığı enerjinin ölçüsüdür. Logaritmik bir ölçek olduğu için, 6.0 büyüklüğündeki bir deprem 5.0 büyüklüğündekinden 10 kat daha güçlü sarsıntı yaratır ve 32 kat daha fazla enerji açığa çıkarır.</p>
        `,
        privacy: `
            <h2>Gizlilik Politikası</h2>
            <p>Son Güncelleme: 12 Şubat 2026</p>
            
            <h3>1. Toplanan Veriler</h3>
            <p>EarthquakeTrack olarak gizliliğinize önem veriyoruz. Sitemizi ziyaret ettiğinizde herhangi bir kişisel verinizi (isim, e-posta, telefon vb.) kaydetmiyoruz. Üyelik sistemi bulunmamaktadır.</p>

            <h3>2. Çerezler (Cookies) ve Yerel Depolama</h3>
            <p>Sitemiz, kullanıcı deneyimini iyileştirmek için tarayıcınızın "Local Storage" özelliğini kullanabilir (örneğin: tema tercihinizi hatırlamak için). Ayrıca Google AdSense ve Google Analytics gibi üçüncü taraf hizmetler, size uygun reklamlar göstermek ve site trafiğini analiz etmek için çerez kullanabilir.</p>

            <h3>3. Konum Bilgisi</h3>
            <p>Harita üzerinde konumunuzu görmek isterseniz, tarayıcınız konum izni isteyecektir. Bu veri sadece cihazınızda işlenir ve sunucularımıza kaydedilmez.</p>

            <h3>4. Üçüncü Taraf Bağlantılar</h3>
            <p>Sitemizdeki dış bağlantıların (örneğin deprem kaynağına giden linkler) gizlilik politikalarından sorumlu değiliz.</p>
        `,
        terms: `
            <h2>Kullanım Koşulları</h2>
            <p>Lütfen sitemizi kullanmadan önce bu koşulları okuyunuz.</p>

            <h3>1. Hizmetin Kullanımı</h3>
            <p>EarthquakeTrack, yalnızca bilgilendirme amaçlıdır. Deprem tahminleri yapmaz veya resmi bir uyarı sistemi yerine geçmez. Doğal afet durumlarında lütfen AFAD ve yetkili mercilerin duyurularını takip ediniz.</p>

            <h3>2. Sorumluluk Reddi</h3>
            <p>Sunulan deprem verileri, sismoloji merkezlerinden otomatik olarak çekilmektedir. Verilerin doğruluğu, kesinliği veya zamanlaması konusunda garanti veremeyiz. Bu verilerin kullanımından doğabilecek zararlardan earthquakeTrack sorumlu tutulamaz.</p>

            <h3>3. Telif Hakları</h3>
            <p>Sitemizin tasarımı ve kodları telif hakları ile korunmaktadır. İzinsiz kopyalanamaz.</p>
        `
    },
    en: {
        about: `
            <h2>About Us</h2>
            <p>EarthquakeTrack is a completely free web application that allows you to track earthquake data in Turkey and around the world instantly.</p>
            
            <h3>Data Sources</h3>
            <p>Our application sources its data from reliable and publicly available API services:</p>
            <ul>
                <li><strong><a href="https://earthquake.usgs.gov/" target="_blank" rel="noopener noreferrer">USGS</a> (United States Geological Survey):</strong> Our main data source for major earthquakes worldwide.</li>
                <li><strong><a href="https://www.emsc-csem.org/" target="_blank" rel="noopener noreferrer">EMSC</a> (European-Mediterranean Seismological Centre):</strong> An important source for earthquake data in the Europe and Mediterranean region.</li>
                <li><strong><a href="http://www.koeri.boun.edu.tr/" target="_blank" rel="noopener noreferrer">Kandilli Observatory</a> and <a href="https://deprem.afad.gov.tr/" target="_blank" rel="noopener noreferrer">AFAD</a>:</strong> Our primary sources for earthquakes in Turkey and the surrounding region.</li>
            </ul>

            <h3>Our Mission</h3>
            <p>As a country located in an earthquake zone, we believe that accessing information quickly and accurately is of vital importance. With EarthquakeTrack, we aim to raise earthquake awareness and present the most up-to-date data to our users in the most understandable way.</p>
        `,
        faq: `
            <h2>Frequently Asked Questions (FAQ)</h2>
            
            <h3>How often is data updated?</h3>
            <p>Data arrives in our system as soon as it is published by seismology centers (USGS, Kandilli, etc.). You can usually see it in the list a few minutes after the earthquake occurs.</p>

            <h3>Why can't I see some earthquakes in the list?</h3>
            <p>Our system defaults to showing earthquakes from the last 24 hours and above a certain magnitude (usually 2.5+). Filtering options will be added in future updates.</p>

            <h3>What does "Magnitude" mean?</h3>
            <p>It is a measure of the energy released by the earthquake. Since it is a logarithmic scale, a magnitude 6.0 earthquake creates shaking 10 times stronger than a magnitude 5.0 earthquake and releases 32 times more energy.</p>
        `,
        privacy: `
            <h2>Privacy Policy</h2>
            <p>Last Update: February 12, 2026</p>
            
            <h3>1. Collected Data</h3>
            <p>We value your privacy at EarthquakeTrack. We do not record any of your personal data (name, email, phone, etc.) when you visit our site. There is no membership system.</p>

            <h3>2. Cookies and Local Storage</h3>
            <p>Our site may use your browser's "Local Storage" feature to improve user experience (for example: to remember your theme preference). Additionally, third-party services such as Google AdSense and Google Analytics may use cookies to show you appropriate ads and analyze site traffic.</p>

            <h3>3. Location Information</h3>
            <p>If you wish to see your location on the map, your browser will request location permission. This data is only processed on your device and is not saved to our servers.</p>

            <h3>4. Third Party Links</h3>
            <p>We are not responsible for the privacy policies of external links on our site (for example links going to the earthquake source).</p>
        `,
        terms: `
            <h2>Terms of Use</h2>
            <p>Please read these terms before using our site.</p>

            <h3>1. Use of Service</h3>
            <p>EarthquakeTrack is for informational purposes only. It does not make earthquake predictions or serve as an official warning system. In case of natural disasters, please follow the announcements of AFAD and authorized authorities.</p>

            <h3>2. Disclaimer</h3>
            <p>The earthquake data presented is automatically retrieved from seismology centers. We cannot guarantee the accuracy, precision, or timing of the data. earthquakeTrack cannot be held responsible for any damages arising from the use of this data.</p>

            <h3>3. Copyrights</h3>
            <p>Our site's design and code are protected by copyright. It cannot be copied without permission.</p>
        `
    }
};
