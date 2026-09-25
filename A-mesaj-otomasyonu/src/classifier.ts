import { normalize } from './normalize.ts';
import { extractOrderNumbers } from './order-number.ts';
import type { Topic } from './types.ts';

export interface Classification { topic: Topic; secondaryPrice: boolean; spam: boolean }

export function classify(message: string): Classification {
  const text = normalize(message);
  const price = /\b(fiyat[a-z]*|ne kadar|kac (?:tl|lira)|ucret[a-z]*|indirim[a-z]*|price[a-z]*|cost|how much|discount[a-z]*)\b/.test(text);
  const effect = /\b(yan(?:di|ma|iyor)[a-z]*|yan etki[a-z]*|kizar[a-z]*|kasinti[a-z]*|sis(?:ti|lik|me)[a-z]*|alerji[a-z]*|dokuntu[a-z]*|tahris[a-z]*|nefes [a-z ]*dar[a-z]*|rash|burn(?:ing|ed|t)?|itch[a-z]*|swelling|irritation|redness|allerg[a-z]*|side effects?|adverse reaction)\b/.test(text);
  const policy = /\b(politika[a-z]*|policy|policies|hayvan[a-z]*|animal testing|cruelty|vegan|kargo firmasi[a-z]*|which (?:courier|carrier)|shipping company)\b/.test(text);
  const explicitComplaint = /\b(sikayet[a-z]*|hasar[a-z]*|ezik|kirik|kirildi|bozuk|sizdir[a-z]*|damaged|broken|complain[a-z]*|defective)\b/.test(text);
  const personalReturn = /\b(iade (?:etmek|istiyorum|edecegim)|i want (?:a refund|to return))\b/.test(text);
  const returnIntent = /\b(iade[a-z]*|refund[a-z]*|return[a-z]*)\b/.test(text) && (!policy || personalReturn);
  const concreteOrder = extractOrderNumbers(message).length > 0
    || /\b(siparisim[a-z]*|siparisin[a-z]*|siparisimiz[a-z]*|my order|our order|order status|siparis (?:durumu|no|numara[a-z]*))\b/.test(text);
  const spam = /\b(takipci|followers?|kazanc|earn money)\b/.test(text)
    && /\b(kasmak|sat[a-z]*|organik|buy|free|kazan[a-z]*)\b/.test(text);
  let topic: Topic;
  if (effect) topic = 'istenmeyen-etki';
  else if (explicitComplaint || returnIntent) topic = 'iade-sikayet';
  else if (concreteOrder) topic = 'siparis-durumu';
  else if (spam) topic = 'diger';
  else if (price) topic = 'fiyat';
  else if (policy) topic = 'diger';
  else if (/\b(urun[a-z]*|serum[a-z]*|krem[a-z]*|nemlendirici[a-z]*|tonik[a-z]*|retinol|cilt[a-z]*|icerik[a-z]*|alkol|product[a-z]*|cream|moisturi[sz]er|skin|ingredients?|stock)\b/.test(text)) topic = 'urun-sorusu';
  else topic = 'diger';
  return { topic, secondaryPrice: topic === 'siparis-durumu' && price, spam: topic === 'diger' && spam };
}
