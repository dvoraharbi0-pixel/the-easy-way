const { state } = require('./store');
const models = require('./models');

function seedIfEmpty() {
  if (Object.keys(state.tables).length === 0) {
    for (let n = 1; n <= 6; n++) {
      models.createTable({ number: n });
    }
  }

  if (Object.keys(state.menuItems).length === 0) {
    const items = [
      // drinks
      { name: 'מים מינרלים', price: 12, category: 'משקאות', course: 'drink' },
      { name: 'לימונדה ביתית', price: 22, category: 'משקאות', course: 'drink' },
      { name: 'קוקה קולה', price: 16, category: 'משקאות', course: 'drink' },
      // starters
      { name: 'חומוס עם פטה', description: 'חומוס ביתי, פטריות מוקרמלות ופיתה חמה', price: 38, category: 'ראשונות', course: 'starter' },
      { name: 'קרפצ׳יו בקר', description: 'פרוסות בקר דקות, שמן זית ופרמזן', price: 52, category: 'ראשונות', course: 'starter' },
      { name: 'סלט חסה גרילדת', description: 'חסה על האש, אנשובי ורוטב סיזר', price: 44, category: 'ראשונות', course: 'starter' },
      // mains
      { name: 'אנטריקוט 300 גרם', description: 'בתוספת ירקות צלויים ובטטה', price: 128, category: 'עיקריות', course: 'main' },
      { name: 'סלמון בגריל', description: 'עם קינואה ורוטב לימון', price: 98, category: 'עיקריות', course: 'main' },
      { name: 'ריזוטו פטריות', description: 'פטריות יער, פרמזן וכמהין', price: 78, category: 'עיקריות', course: 'main' },
      { name: 'פסטה ארביאטה', description: 'פנה חריף בעגבניות ובזיליקום', price: 62, category: 'עיקריות', course: 'main' },
      // desserts
      { name: 'טירמיסו', description: 'קלאסי איטלקי', price: 36, category: 'קינוחים', course: 'dessert' },
      { name: 'מלבי', description: 'עם סירופ ורדים ואגוזים', price: 32, category: 'קינוחים', course: 'dessert' },
    ];
    for (const item of items) models.addMenuItem(item);
  }
}

module.exports = { seedIfEmpty };
