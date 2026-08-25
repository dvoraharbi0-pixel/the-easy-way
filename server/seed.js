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
      { name: 'מים מינרלים', price: 12, category: 'משקאות', course: 'drink', imageSlug: 'water' },
      { name: 'לימונדה ביתית עם נענע', price: 24, category: 'משקאות', course: 'drink', imageSlug: 'lemonade' },
      { name: 'קולה / קולה זירו', price: 16, category: 'משקאות', course: 'drink', imageSlug: 'cola' },
      { name: 'תה קר פירותי', price: 22, category: 'משקאות', course: 'drink', imageSlug: 'iced-tea' },
      { name: 'בירה מהחבית', price: 28, category: 'משקאות', course: 'drink', imageSlug: 'beer' },
      { name: 'כוס יין בית, אדום או לבן', price: 34, category: 'משקאות', course: 'drink', imageSlug: 'wine' },
      // starters
      { name: 'חומוס עם פטה', description: 'חומוס ביתי, פטריות מוקרמלות ופיתה חמה', price: 38, category: 'ראשונות', course: 'starter', imageSlug: 'hummus' },
      { name: 'קרפצ׳יו בקר', description: 'פרוסות בקר דקות, שמן זית ופרמזן', price: 52, category: 'ראשונות', course: 'starter', imageSlug: 'beef-carpaccio' },
      { name: 'חסה גרילדת', description: 'חסה על האש, אנשובי ורוטב סיזר', price: 44, category: 'ראשונות', course: 'starter', imageSlug: 'grilled-lettuce' },
      { name: 'טרטר טונה אדומה', description: 'אבוקדו ושומשום', price: 58, category: 'ראשונות', course: 'starter', imageSlug: 'tuna-tartare' },
      { name: 'קרפצ׳יו סלק צלוי', description: 'גבינת עיזים ואגוזי מלך', price: 46, category: 'ראשונות', course: 'starter', imageSlug: 'beet-carpaccio' },
      { name: 'מרק העונה של השף', price: 36, category: 'ראשונות', course: 'starter', imageSlug: 'soup-of-the-day' },
      // mains
      { name: 'אנטריקוט 300 גרם', description: 'ירקות צלויים ובטטה', price: 128, category: 'עיקריות', course: 'main', imageSlug: 'entrecote' },
      { name: 'סלמון בגריל', description: 'קינואה ורוטב לימון', price: 98, category: 'עיקריות', course: 'main', imageSlug: 'salmon' },
      { name: 'ריזוטו פטריות יער', description: 'פרמזן וכמהין', price: 78, category: 'עיקריות', course: 'main', imageSlug: 'mushroom-risotto' },
      { name: 'פנה ארביאטה חריפה', description: 'עגבניות ובזיליקום', price: 62, category: 'עיקריות', course: 'main', imageSlug: 'penne-arrabbiata' },
      { name: 'דניס שלם בתנור', description: 'ירקות ים תיכוניים', price: 108, category: 'עיקריות', course: 'main', imageSlug: 'baked-dorade' },
      { name: 'המבורגר בית 200 גרם', description: 'צ׳דר ובייקון', price: 72, category: 'עיקריות', course: 'main', imageSlug: 'burger' },
      // desserts
      { name: 'טירמיסו קלאסי', price: 36, category: 'קינוחים', course: 'dessert', imageSlug: 'tiramisu' },
      { name: 'מלבי', description: 'עם סירופ ורדים ואגוזים', price: 32, category: 'קינוחים', course: 'dessert', imageSlug: 'malabi' },
      { name: 'פאדנט שוקולד חם', description: 'מוגש עם גלידה', price: 42, category: 'קינוחים', course: 'dessert', imageSlug: 'chocolate-fondant' },
      { name: 'קרם ברולה', description: 'בווניל מדגסקר', price: 34, category: 'קינוחים', course: 'dessert', imageSlug: 'creme-brulee' },
      { name: 'סורבה פירות העונה', price: 28, category: 'קינוחים', course: 'dessert', imageSlug: 'sorbet' },
    ];
    for (const item of items) models.addMenuItem(item);
  }
}

module.exports = { seedIfEmpty };
