# DOORA teknik denetim

Tarih: 20.11.2026  
Durum: Devam ediyor. Tamamlanan inceleme ve düzeltmeler, canlı ortamda onay bekleyen işler ve henüz doğrulanmayan testler ayrı tutulur.

## Kapsam
- Next.js App Router sayfaları ve ortak bileşenler
- Kimlik doğrulama ve oturum
- İlan, teklif, iş akışı ve güvenlik API'leri
- Cüzdan ve emanet fonksiyonları
- Neon tabloları, kısıtlar ve fonksiyonlar
- Cloudflare Workers / OpenNext yapılandırması
- Erişilebilen Vercel üretim derleme kayıtları ve canlı API'ler

## Doğrulanmış bulgular

| Öncelik | Bulgu | Durum |
|---|---|---|
| Kritik | OpenNext 1.20.17, Next 16.3.8 sürümünü desteklemediği için üretim kurulumunda ERESOLVE oluşuyordu. | Kaynakta sürüm eşleştirmesi düzeltildi; yeni derleme bekleniyor. |
| Kritik | Wrangler yapılandırması `doora-app` Worker'ını hedefliyordu; mevcut üretim Worker adı `doora`. | Kaynakta hedef adı düzeltildi; Cloudflare sürümü henüz doğrulanmadı. |
| Yüksek | Veritabanı görev durum kısıtı `disputed` değerini kabul etmiyor; anlaşmazlık akışı bu nedenle başarısız oluyor. | 0007 migration hazırlandı; canlı veritabanına uygulanmadı. |
| Yüksek | Teklif kabulü / emanet serbest bırakma sonrasında bildirim hatası ana işlemi başarısız gösterebiliyordu. | Kaynakta düzeltme hazırlanıyor. |
| Yüksek | Anlaşmazlık kaydı ile görev durum güncellemesi ayrı sorgulardı; biri başarılı diğeri başarısız olabiliyordu. | Kaynakta atomik sorguya dönüştürülüyor. |
| Yüksek | Oturum açmış kullanıcı ilan detayında teklif veremiyor, tekrar giriş sayfasına yönlendiriliyordu. | Kaynakta düzeltme hazırlanıyor. |
| Orta | Kaydedilen ilandaki detay bağlantısı genel iş listesine gidiyordu. | Düzeltildi. |
| Orta | Profilde değiştirilen ad, para çekme hesap sahibi adı olarak kullanılmıyordu. | Kaynakta düzeltme hazırlanıyor. |
| Orta | Çıkış hatası yakalanmadığı için kullanıcıya açıklama gösterilmiyordu. | Düzeltildi. |
| Orta | Kaydedilenler sekmelerinde Radix roving-focus bileşeni kullanılıyordu. | Yerel butonlara taşındı; Radix sekme bağımlılığı kaldırıldı. |

## Henüz tamamlanmamış / doğrulanması gerekenler
- Şifre sıfırlama ve doğrulama kodunu yeniden gönderme akışı.
- Bildirim tercihleri kayıt ediliyor; tüm bildirim üretim noktalarında bu tercihlere uyulup uyulmadığı tamamlanmalı.
- Bildirim merkezi / okunmamış bildirim listesi kullanıcı arayüzü bulunmuyor.
- Şikâyet ve anlaşmazlıkları inceleyecek yönetici ekranı ve çözüm API'si bulunmuyor.
- Engellenen kullanıcıları listeleme ve engeli kaldırma akışı bulunmuyor.
- Değerlendirme oluşturma var; değerlendirmeleri listeleme / profil puanını gösterme akışı tamamlanmalı.
- Cüzdan açıkça TEST modunda. Gerçek ödeme, banka transferi, çekim onayı ve anlaşmazlıkta iade akışı mevcut değil.
- Kullanım koşulları ve gizlilik metinleri için gerçek sayfalar / bağlantılar eksik.
- İş listelerinde sayfalama yok; açık ilan API'si en fazla 60 kayıt döndürüyor.
- Otomatik test paketi ve CI doğrulaması yok.
- Profil fotoğrafları veri URL'si olarak veritabanında tutuluyor; nesne depolama ve boyut optimizasyonu değerlendirilmeli.
- Canlı Cloudflare Worker dağıtımı ve gerçek mobil etkileşim testi henüz doğrulanmadı.

## Üretim veritabanı notu
`db/migrations/0007_task_dispute_status.sql` yalnızca görev durum kısıtını desteklenen durumlarla eşleştirir. Canlı Neon veritabanına uygulanmadan önce kullanıcı onayı ve migration testi gereklidir. Bu denetimde canlı veriler değiştirilmemiştir.
