# gozumyoruluyo

Minimalist, göz dostu PDF okuyucu. Uygulamanın adı **gozumyoruluyo** olarak güncellendi. **Tek kaynak kod, iki dağıtım:** GitHub Pages üzerinden tarayıcı ve Electron ile Windows uygulaması.

## Tarayıcıda kullanım

Web sürümünde PDF'ler **hiçbir sunucuya yüklenmez**. Seçtiğiniz PDF dosyaları ve kapakları tarayıcınızın **IndexedDB** alanına yerel olarak kopyalanır; ilerleme ve ayarlar aynı tarayıcı profilinde tutulur. Site daha sonra çevrimdışı açılabilir garantisi verilmez; PDF dosyaları mevcut oturumda cihazın kendi depolamasından okunur.

- Farklı tarayıcılar, tarayıcı profilleri ve cihazlar farklı kütüphanelere sahiptir.
- Tarayıcı verilerinin temizlenmesi veya gizli mod kitapların kaybolmasına neden olabilir.
- Çok büyük PDF dosyalarında depolama kotası sınırına ulaşılabilir.
- Web sürümündeki kitaplar Windows sürümüne otomatik aktarılmaz; aynı PDF'leri yeniden eklemek gerekir.
- Tarayıcıda dosyalar IndexedDB'ye **kopyalanır**. Windows uygulaması ise PDF'nin orijinal dosya yolunu takip eder.

## Yerel geliştirme ve test

Node.js 22+ kurun. Proje kökünde:

```bash
npm install
npm run web:dev     # Tarayıcı: http://localhost:5173
npm run dev         # Electron masaüstü uygulaması
npm run build       # TypeScript kontrolü ve web üretim derlemesi
npm run dist:win    # Windows EXE kurulum dosyası, release/ altında
```

## GitHub'a yükleme

GitHub üzerinde **gozumyoruluyo** adlı boş bir **Public** repository oluşturun (README veya .gitignore eklemeyin, bu dosyalar projede mevcut). Kök klasörde PowerShell açın:

```powershell
git init
git add .
git commit -m "gozumyoruluyo: web and desktop"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADINIZ/gozumyoruluyo.git
git push -u origin main
```

Git'in kurulu olması gerekir. `KULLANICI_ADINIZ` yerine kendi GitHub kullanıcı adınızı yazın. GitHub CLI veya Git Credential Manager ile kimlik doğrulaması gerekebilir.

### Web sitesini GitHub Pages'te yayımlama

1. GitHub reposunda **Settings → Pages** açın.
2. **Build and deployment → Source: GitHub Actions** seçin.
3. **Actions → Publish website (GitHub Pages)** akışının tamamlanmasını bekleyin. Gerekirse **Run workflow**'a basın.
4. Adres genellikle `https://KULLANICI_ADINIZ.github.io/gozumyoruluyo/` olur; gerçek adresi Actions dağıtım çıktısından kontrol edin.

Web paketinde Vite `base: './'` kullanılır; proje alt yolunda (`/gozumyoruluyo/`) PDF.js worker ve varlık dosyaları düzgün yüklenir.

### İndirilebilir Windows sürümü

Ana dala yapılan her gönderimde **Actions → Windows installer** akışı çalışır ve **Artifacts** bölümüne geçici kurulum dosyasını yükler.

Herkesin doğrudan indirebilmesi için GitHub **Releases** yayımlayın:

```powershell
git tag v1.0.0
git push origin v1.0.0
```

`v1.0.0` etiketi GitHub Actions tarafından Windows EXE derlemesini başlatır, başarılı olursa **Releases** altında kurulum dosyası eklenir. Başarılı derleme tamamlanmadan sürümü yayımlanmış saymayın.

**Not:** İmzasız EXE'ler Windows SmartScreen uyarısı gösterebilir. Kod imzalama ayrı bir işlemdir.

## Kontroller

Sağ/sol ok: sayfa geçişi. Fare tekerleği: sayfa. F: tam ekran. Esc: çıkış. + / -: yakınlaştırma. 0: sığdır. H: menüyü gizle/göster. Tek/çift sayfa, üç tema, yumuşak sayfa modu ve ilerleme kaydı bulunur.

## Güvenlik

PDF dosyaları harici sunucuya gönderilmez. Electron'da `contextIsolation`, `sandbox` ve `nodeIntegration:false` etkin. Tarayıcı depolaması yalnızca aynı origin üzerinden erişilebilen IndexedDB'dir. GitHub Pages public repo kaynak kodları herkes tarafından görüntülenebilir; PDF kitaplarınız repoya konmaz.

## Test durumu

Önceki masaüstü sürümü kullanıcı tarafından Windows'ta temel işlevleriyle doğrulandı. Web adaptörü bu sürümde eklendi ancak geliştirici ortamında npm paketlerinin indirilmesi engellendiği için otomatik derleme ve web tarayıcısı üzerinden uçtan uca test henüz gerçekleştirilemedi. GitHub Actions çıktılarıyla doğrulama gereklidir.

## Önceki masaüstü verileri

Daha önce Elegant Reader adıyla okuduğunuz kitapların yerel kayıt dosyası, yeni uygulamanın ilk açılışında yeni kayıt bulunmuyorsa otomatik kopyalanmaya çalışılır. PDF dosyalarının eski konumda olması gerekir. Eski uygulamayı ve dosyaları bu kontrol tamamlanmadan silmeyin.
