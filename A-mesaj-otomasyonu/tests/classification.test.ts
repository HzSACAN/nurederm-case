import { describe, expect, it } from 'vitest';
import { classify } from '../src/classifier.ts';
import { extractOrderNumbers } from '../src/order-number.ts';
import type { Topic } from '../src/types.ts';

describe('açıklanabilir sınıflandırma', () => {
  const cases: [string, Topic][] = [
    ['RETİNOL SERUM İÇERİĞİ NEDİR?', 'urun-sorusu'],
    ['What ingredients are in this cream?', 'urun-sorusu'],
    ['Nemlendirici kaç lira?', 'fiyat'],
    ['How much does this cost?', 'fiyat'],
    ['Siparişim hâlâ ulaşmadı', 'siparis-durumu'],
    ['Hi, where is my order #84?', 'siparis-durumu'],
    ['Kutu kırık geldi', 'iade-sikayet'],
    ['I want a refund for a damaged item', 'iade-sikayet'],
    ['Yüzüm KIZARDI ve kaşıntı var', 'istenmeyen-etki'],
    ['I got a rash after this serum', 'istenmeyen-etki'],
    ['Kullandıktan sonra yan etki yaşadım', 'istenmeyen-etki'],
    ['Serumdan sonra yüzümde şişme oldu', 'istenmeyen-etki'],
    ['This cream caused irritation and redness', 'istenmeyen-etki'],
    ['Teşekkür ederim', 'diger'],
    ['Siparişler hangi kargo firmasıyla gönderiliyor?', 'diger'],
    ['Ürünleriniz hayvanlar üzerinde test ediliyor mu?', 'diger'],
    ['İade politikanız nedir?', 'diger'],
    ['İade politikanız nedir? Ürünü iade etmek istiyorum.', 'iade-sikayet'],
    ['Sipariş numaramı bulamadım, sorgulayabilir misiniz?', 'siparis-durumu'],
    ['Which courier do you use?', 'diger'],
    ['Takipçi kasmak ister misiniz? %100 organik takipçi: https://example.invalid', 'diger'],
    ['Sipariş no: 58, fiyatı ne kadar?', 'siparis-durumu'],
    ['İade istiyorum, sipariş no: 58. Fiyat ne?', 'iade-sikayet'],
    ['Order #58 arrived damaged and caused swelling, refund please', 'istenmeyen-etki'],
  ];
  it.each(cases)('%s → %s', (message, topic) => expect(classify(message).topic).toBe(topic));
  it('tek konu seçer ve ikincil fiyatı belirtir', () => {
    expect(classify('Krem fiyatı nedir ve 48 numaralı siparişim nerede?'))
      .toEqual({ topic: 'siparis-durumu', secondaryPrice: true, spam: false });
  });
});

describe('bağlama bağlı sipariş numarası', () => {
  const cases: [string, number[]][] = [
    ['12 numaralı siparişim', [12]], ['sipariş no: 12', [12]], ['order #3', [3]],
    ['SİPARİŞ NUMARASI: 58', [58]], ['Siparişim #62 nerede?', [62]],
    ['Tonik 200 ml mi?', []], ['Müşteri numaram 71; siparişim nerede?', []],
    ['Siparişim 200 ml serum içeriyor, nerede?', []], ['Siparişim hâlâ ulaşmadı', []],
    ['Siparişim 5 gün önce verildi', []], ['My order 2 weeks ago has not arrived', []],
    ['order #12.5', []], ['sipariş no: 12abc', []],
    ['12.5 numaralı siparişim', []], ['12-5 numaralı siparişim', []],
    ['12 numaralı siparişim ve order #93', [12, 93]],
    ['12 ve 93 numaralı siparişlerim', [12, 93]],
    ['sipariş no: 12, 93', [12, 93]], ['order #12 and #93', [12, 93]],
    ['Sipariş no: 12, order #12', [12]], ['order #0', []],
    ['order #9007199254740993', []],
  ];
  it.each(cases)('%s', (message, expected) => expect(extractOrderNumbers(message)).toEqual(expected));
});
