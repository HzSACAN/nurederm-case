export function normalize(text: string): string {
  return text.toLocaleLowerCase('tr-TR').replaceAll('ı', 'i')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replaceAll('ş', 's').replaceAll('ç', 'c').replaceAll('ğ', 'g');
}
