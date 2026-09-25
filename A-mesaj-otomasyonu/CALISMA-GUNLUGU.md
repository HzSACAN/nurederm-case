# Bölüm A çalışma günlüğü

- 25.09.2026 10.07–10.09 Europe/Istanbul: Ortam kontrol edildi; ilk dosya yazımı kullanıcı promptunun tam kaydı oldu. Kaynak iki dosya tamamen okundu. Node v24.19.0 mevcut. Git deposu bulunmadı ve oluşturuldu. Mevcut Git kimliği kullanılıyor; kimlik üretilmedi.
- İlk ortam kontrolünde `npm --version` başarısız: npm PATH üzerinde yok. Kurulu Node dizininde yalnızca Node ve pnpm bulunuyor; yerel/geçici npm kurulumu araştırılıyor.
- Plan: strict TypeScript modülleri → ağdan bağımsız davranış/güvenlik testleri → gerçek API ile çıktılar → sonuçların belgelenmesi ve yerel commit'ler.
- Kaynak SHA-256: `case-brief.md` = `AA6C90817B4552B9CA435C0155BCAC94F15295D9C23B13EE02D9B463EB1BA6FB`; `mesajlar.json` = `E431D6EA36046F284FFA1DFC44904398423D30FAF6A90553684A534B738C553A`.
- 10.10–10.16: npm indirme sandbox ağ iznine takıldı; indirme gerçekleşmediği için arşiv açma ve npm çalıştırma da başarısız oldu. İzinli tekrar ile resmi registry'den npm 10.9.3 `.tmp/` altına indirildi. Paket kurulumu sandbox içinde ilerlemeyince durduruldu; izinli tekrar 54 paket kurarak tamamlandı. Paket kilidi üretildi. `.tmp/` ve bağımlılıklar Git dışında.
- Git commit denemeleri farklı sandbox kullanıcı sahipliği (`dubious ownership`) ve salt okunur `.git/index.lock` engeline takıldı. İzinli komutlarda yalnızca bu depo için `-c safe.directory=...` kullanılarak çözüldü; global Git ayarı ve kimliği değiştirilmedi. İlk belge/prompt commit'i oluşturuldu.
- 10.19: İlk strict typecheck başarılı; Vitest 4 dosyada 89/89 test geçti. Bu sonuçlar mock testlerine aittir, canlı API kanıtı değildir.
- 10.20: İlave uç durum testlerinde 6 hata bulundu: “yan etki”, “şişme”, İngilizce irritation/redness sözlüğü eksikti; siparişten sonraki gün/hafta sayıları ve ondalıklı numara yanlış çıkarılıyordu. Sözlük genişletildi; süre/birimler ve parçalı numaralar dışlandı. Genel iade politikasıyla birlikte açık kişisel iade talebi için de öncelik netleştirildi.
