import { classify } from './classifier.ts';
import { extractOrderNumbers } from './order-number.ts';
import type { ApiFailure, CartLookup, Message, RequestRecord } from './types.ts';

function failureNote(failure: ApiFailure): string {
  const labels: Record<ApiFailure['kind'], string> = {
    'not-found': 'Sipariş bulunamadı', timeout: 'API zaman aşımı', network: 'API bağlantı hatası',
    http: 'API HTTP hatası', 'invalid-response': 'Geçersiz API yanıtı',
  };
  return `${labels[failure.kind]}; HTTP ${failure.status ?? 'durumu alınamadı'}; deneme: ${failure.attempts}. Temsilci kontrolü gerekli.`;
}

export async function processMessage(message: Message, lookup: CartLookup): Promise<RequestRecord> {
  const classification = classify(message.mesaj);
  const result: RequestRecord = {
    id: message.id, konu: classification.topic, devret: false, cevap_taslagi: '', not: '',
  };
  if (result.konu === 'istenmeyen-etki' || result.konu === 'iade-sikayet') {
    result.devret = true;
    result.cevap_taslagi = 'Mesajınızı müşteri temsilcimize yönlendiriyoruz. Temsilcimiz talebinizi değerlendirecek.';
    result.not = 'Hassas konu: insan değerlendirmesi gerekli. API sorgusu yapılmadı.';
    return result;
  }
  if (result.konu === 'siparis-durumu') {
    const priceNote = classification.secondaryPrice ? ' İkincil fiyat talebi var; güncel fiyat temsilci tarafından doğrulanmalı.' : '';
    const numbers = extractOrderNumbers(message.mesaj);
    if (numbers.length === 0) {
      result.cevap_taslagi = 'Siparişinizi sorgulayabilmemiz için sipariş numaranızı paylaşır mısınız?';
      result.not = 'Sipariş numarası bulunamadı; müşteri kimliği sipariş numarası olarak kullanılmadı.';
    } else if (numbers.length > 1) {
      result.devret = true;
      result.cevap_taslagi = 'Mesajınızda birden fazla sipariş numarası bulundu. Talebinizi netleştirmek üzere temsilcimize yönlendiriyoruz.';
      result.not = 'Birden fazla farklı sipariş numarası: otomatik seçim ve API sorgusu yapılmadı.';
    } else {
      const orderId = numbers[0];
      if (orderId === undefined) throw new Error('Sipariş numarası bulunamadı.');
      try {
        const response = await lookup(orderId);
        if (!response.ok) {
          result.devret = true;
          result.cevap_taslagi = response.kind === 'not-found'
            ? 'Belirttiğiniz sipariş bulunamadı. Numaranın kontrol edilmesi için talebinizi temsilcimize yönlendiriyoruz.'
            : 'Sipariş bilgisi şu anda doğrulanamıyor. Kontrol için talebinizi temsilcimize yönlendiriyoruz.';
          result.not = failureNote(response);
        } else if (response.cart.userId !== message.musteri_id) {
          // Do not copy, stringify or log cart data before authorization succeeds.
          result.devret = true;
          result.cevap_taslagi = 'Siparişin size ait olduğunu doğrulayamadık. Kontrol için talebinizi temsilcimize yönlendiriyoruz.';
          result.not = 'Sahiplik eşleşmedi; sipariş ayrıntıları paylaşılmadı.';
        } else {
          const products = response.cart.products.map(product => `${product.title} (${product.quantity} adet)`).join('; ');
          result.cevap_taslagi = `Sipariş içeriğiniz: ${products}. Toplam: ${response.cart.total}. Kargo durumunuzu şu anda doğrulayamıyoruz.`;
          result.not = 'Sipariş sahipliği doğrulandı. Tutar API total alanından alındı. Test API’sinde kargo durumu, takip numarası, teslim tarihi ve para birimi bilgisi bulunmuyor.';
        }
      } catch {
        // Injected adapters may throw too. Never expose their error messages.
        result.devret = true;
        result.cevap_taslagi = 'Sipariş bilgisi şu anda doğrulanamıyor. Talebinizi temsilcimize yönlendiriyoruz.';
        result.not = 'Sipariş sorgusu tamamlanamadı; temsilci kontrolü gerekli.';
      }
    }
    result.not += priceNote;
    if (classification.secondaryPrice) {
      result.devret = true;
      result.cevap_taslagi += ' Fiyat talebinizi temsilcimize yönlendiriyoruz.';
    }
    return result;
  }
  if (result.konu === 'urun-sorusu') {
    result.cevap_taslagi = 'Ürün hakkındaki sorunuzu aldık. Doğrulanmış ürün bilgisi için talebinizi temsilcimize yönlendiriyoruz.';
    result.not = 'Ürün arama bonusu uygulanmadı; içerik, stok veya kullanım uygunluğu hakkında bilgi üretilmedi.';
    result.devret = true;
  } else if (result.konu === 'fiyat') {
    result.cevap_taslagi = 'Güncel fiyat veya indirim bilgisini doğrulamak için talebinizi temsilcimize yönlendiriyoruz.';
    result.not = 'Doğrulanmış fiyat/indirim kaynağı yok; fiyat ya da indirim kodu uydurulmadı.';
    result.devret = true;
  } else if (classification.spam) {
    result.cevap_taslagi = '';
    result.not = 'Olası spam; yanıt önerilmedi ve dış bağlantılar ziyaret edilmedi.';
  } else {
    result.cevap_taslagi = 'Talebinizi aldık. Doğrulanmış bilgi paylaşılması için mesajınızı temsilcimize yönlendiriyoruz.';
    result.not = 'Genel/belirsiz talep; kargo firması veya marka politikası hakkında varsayım yapılmadı.';
    result.devret = true;
  }
  return result;
}

export async function processMessages(messages: readonly Message[], lookup: CartLookup): Promise<RequestRecord[]> {
  const results: RequestRecord[] = [];
  for (const message of messages) results.push(await processMessage(message, lookup));
  return results;
}
