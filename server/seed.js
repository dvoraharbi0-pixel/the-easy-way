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
      { name: 'מים מינרלים', price: 12, category: 'משקאות', course: 'drink', imageSlug: 'water', ingredients: 'מים מינרלים טבעיים' },
      { name: 'לימונדה ביתית עם נענע', price: 24, category: 'משקאות', course: 'drink', imageSlug: 'lemonade', ingredients: 'לימון סחוט טרי, נענע, סוכר, מים מוגזים' },
      { name: 'קולה / קולה זירו', price: 16, category: 'משקאות', course: 'drink', imageSlug: 'cola', ingredients: 'משקה מוגז' },
      { name: 'תה קר פירותי', price: 22, category: 'משקאות', course: 'drink', imageSlug: 'iced-tea', ingredients: 'תה שחור, אפרסק, פירות יער טריים, קרח' },
      { name: 'בירה מהחבית', price: 28, category: 'משקאות', course: 'drink', imageSlug: 'beer', ingredients: 'שעורה, כשות, שמרים, מים', allergens: ['גלוטן'] },
      { name: 'כוס יין בית, אדום או לבן', price: 34, category: 'משקאות', course: 'drink', imageSlug: 'wine', ingredients: 'ענבים, לבחירה אדום או לבן', allergens: ['סולפיטים'] },
      // starters
      { name: 'חומוס עם פטה', description: 'חומוס ביתי, פטריות מוקרמלות ופיתה חמה', price: 38, category: 'ראשונות', course: 'starter', imageSlug: 'hummus', ingredients: 'חומוס טחון, טחינה גולמית, פטריות מוקרמלות, פיתה חמה, שמן זית, פפריקה', allergens: ['שומשום', 'גלוטן'] },
      { name: 'קרפצ׳יו בקר', description: 'פרוסות בקר דקות, שמן זית ופרמזן', price: 52, category: 'ראשונות', course: 'starter', imageSlug: 'beef-carpaccio', ingredients: 'פרוסות בקר דקות, שמן זית כתית, פרמזן, עלי רוקט', allergens: ['חלב'] },
      { name: 'חסה גרילדת', description: 'חסה על האש, אנשובי ורוטב סיזר', price: 44, category: 'ראשונות', course: 'starter', imageSlug: 'grilled-lettuce', ingredients: 'חסה רומית צלויה, אנשובי, רוטב סיזר ביתי, קרוטונים, פרמזן', allergens: ['דגים', 'חלב', 'גלוטן', 'ביצים'] },
      { name: 'טרטר טונה אדומה', description: 'אבוקדו ושומשום', price: 58, category: 'ראשונות', course: 'starter', imageSlug: 'tuna-tartare', ingredients: 'טונה אדומה טרייה, אבוקדו, שומשום קלוי, רוטב סויה-וואסאבי', allergens: ['דגים', 'שומשום', 'סויה'], spicy: true },
      { name: 'קרפצ׳יו סלק צלוי', description: 'גבינת עיזים ואגוזי מלך', price: 46, category: 'ראשונות', course: 'starter', imageSlug: 'beet-carpaccio', ingredients: 'סלק צלוי, גבינת עיזים, אגוזי מלך, בלסמי, עלי בייבי', allergens: ['חלב', 'אגוזים'] },
      { name: 'מרק העונה של השף', price: 36, category: 'ראשונות', course: 'starter', imageSlug: 'soup-of-the-day', ingredients: 'ירקות טריים לפי העונה, ציר ירקות ביתי' },
      // mains
      { name: 'אנטריקוט 300 גרם', description: 'ירקות צלויים ובטטה', price: 128, category: 'עיקריות', course: 'main', imageSlug: 'entrecote', ingredients: 'אנטריקוט בקר, ירקות שורש צלויים, בטטה, רוטב פלפל שחור' },
      { name: 'סלמון בגריל', description: 'קינואה ורוטב לימון', price: 98, category: 'עיקריות', course: 'main', imageSlug: 'salmon', ingredients: 'פילה סלמון, קינואה, לימון, עשבי תיבול', allergens: ['דגים'] },
      { name: 'ריזוטו פטריות יער', description: 'פרמזן וכמהין', price: 78, category: 'עיקריות', course: 'main', imageSlug: 'mushroom-risotto', ingredients: 'אורז ריזוטו, פטריות יער, פרמזן, שמנת, כמהין', allergens: ['חלב'] },
      { name: 'פנה ארביאטה חריפה', description: 'עגבניות ובזיליקום', price: 62, category: 'עיקריות', course: 'main', imageSlug: 'penne-arrabbiata', ingredients: 'פסטה פנה, עגבניות, שום, פלפל צ׳ילי חריף, בזיליקום', allergens: ['גלוטן'], spicy: true },
      { name: 'דניס שלם בתנור', description: 'ירקות ים תיכוניים', price: 108, category: 'עיקריות', course: 'main', imageSlug: 'baked-dorade', ingredients: 'דג דניס שלם, ירקות ים תיכוניים, שמן זית, לימון', allergens: ['דגים'] },
      { name: 'המבורגר בית 200 גרם', description: 'צ׳דר ובייקון', price: 72, category: 'עיקריות', course: 'main', imageSlug: 'burger', ingredients: 'בקר טחון בית, לחמניית בריוש, גבינת צ׳דר, בייקון, ירקות', allergens: ['גלוטן', 'חלב', 'ביצים'] },
      // desserts
      { name: 'טירמיסו קלאסי', price: 36, category: 'קינוחים', course: 'dessert', imageSlug: 'tiramisu', ingredients: 'מסקרפונה, ביסקוטי ספוג בקפה, קקאו, ביצים', allergens: ['חלב', 'ביצים', 'גלוטן'] },
      { name: 'מלבי', description: 'עם סירופ ורדים ואגוזים', price: 32, category: 'קינוחים', course: 'dessert', imageSlug: 'malabi', ingredients: 'קורנפלור, חלב, סירופ ורדים, אגוזים קלויים, קוקוס', allergens: ['חלב', 'אגוזים'] },
      { name: 'פאדנט שוקולד חם', description: 'מוגש עם גלידה', price: 42, category: 'קינוחים', course: 'dessert', imageSlug: 'chocolate-fondant', ingredients: 'שוקולד מריר, חמאה, ביצים, קמח, גלידת וניל', allergens: ['חלב', 'ביצים', 'גלוטן'] },
      { name: 'קרם ברולה', description: 'בווניל מדגסקר', price: 34, category: 'קינוחים', course: 'dessert', imageSlug: 'creme-brulee', ingredients: 'שמנת, ביצים, וניל מדגסקר, סוכר קרמל', allergens: ['חלב', 'ביצים'] },
      { name: 'סורבה פירות העונה', price: 28, category: 'קינוחים', course: 'dessert', imageSlug: 'sorbet', ingredients: 'פירות טריים לפי העונה, סוכר, מים' },
    ];
    for (const item of items) models.addMenuItem(item);
  }
}

module.exports = { seedIfEmpty };
