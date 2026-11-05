# gozumyoruluyo
## Tarayıcıda kullanım

Web sürümünde PDF'ler **hiçbir sunucuya yüklenmez**. Seçtiğiniz PDF dosyaları ve kapakları tarayıcınızın **IndexedDB** alanına yerel olarak kopyalanır; ilerleme ve ayarlar aynı tarayıcı profilinde tutulur. Site daha sonra çevrimdışı açılabilir garantisi verilmez; PDF dosyaları mevcut oturumda cihazın kendi depolamasından okunur.

- Farklı tarayıcılar, tarayıcı profilleri ve cihazlar farklı kütüphanelere sahiptir.
- Tarayıcı verilerinin temizlenmesi veya gizli mod kitapların kaybolmasına neden olabilir.
- Çok büyük PDF dosyalarında depolama kotası sınırına ulaşılabilir.
- Web sürümündeki kitaplar Windows sürümüne otomatik aktarılmaz; aynı PDF'leri yeniden eklemek gerekir.
- Tarayıcıda dosyalar IndexedDB'ye **kopyalanır**. Windows uygulaması ise PDF'nin orijinal dosya yolunu takip eder.
