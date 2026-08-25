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
      // ---- שתייה קלה ----
      { name: 'קולה', price: 15, category: 'שתייה קלה', course: 'drink' },
      { name: 'קולה זירו', price: 15, category: 'שתייה קלה', course: 'drink' },
      { name: 'פריגת לימונענע', price: 15, category: 'שתייה קלה', course: 'drink' },
      { name: 'ספרייט', price: 15, category: 'שתייה קלה', course: 'drink' },
      { name: 'מים מינרלים', price: 14, category: 'שתייה קלה', course: 'drink' },
      { name: 'סודה', price: 14, category: 'שתייה קלה', course: 'drink' },
      { name: 'פחית רדבול', price: 18, category: 'שתייה קלה', course: 'drink' },
      // ---- בירות ----
      { name: 'קורונה', price: 36, category: 'בירות', course: 'drink' },
      { name: 'קסטיל', price: 38, category: 'בירות', course: 'drink' },
      { name: 'גינס (פחית)', price: 37, category: 'בירות', course: 'drink' },
      { name: 'שיקמה (חבית)', price: 33, category: 'בירות', course: 'drink' },
      { name: 'קרלסברג (חבית)', price: 33, category: 'בירות', course: 'drink' },
      { name: 'טובורג (חבית)', price: 33, category: 'בירות', course: 'drink' },
      { name: 'וויינשטפן (חבית)', price: 33, category: 'בירות', course: 'drink' },
      { name: 'לומה (חבית)', price: 33, category: 'בירות', course: 'drink' },
      // ---- יין ומבעבעים (מחיר לכוס) ----
      { name: 'רוזה Artisanal', description: 'כוס', ingredients: 'יין רוזה, מוגש בכוס', price: 53, category: 'יין ומבעבעים', course: 'drink', allergens: ['סולפיטים'] },
      { name: 'שרדונה Artisanal (לבן)', description: 'כוס', ingredients: 'יין לבן שרדונה, מוגש בכוס', price: 53, category: 'יין ומבעבעים', course: 'drink', allergens: ['סולפיטים'] },
      { name: 'מרלו Artisanal (אדום)', description: 'כוס', ingredients: 'יין אדום מרלו, מוגש בכוס', price: 49, category: 'יין ומבעבעים', course: 'drink', allergens: ['סולפיטים'] },
      { name: 'בלאן נאן גוורץ (לבן, כשר לפסח)', description: 'כוס', ingredients: 'יין לבן גוורצטרמינר, כשר לפסח', price: 58, category: 'יין ומבעבעים', course: 'drink', allergens: ['סולפיטים'] },
      { name: 'שבלי (לבן)', description: 'כוס', ingredients: 'יין לבן שבלי, מוגש בכוס', price: 59, category: 'יין ומבעבעים', course: 'drink', allergens: ['סולפיטים'] },
      { name: 'פינו נואר (אדום)', description: 'כוס', ingredients: 'יין אדום פינו נואר, מוגש בכוס', price: 54, category: 'יין ומבעבעים', course: 'drink', allergens: ['סולפיטים'] },
      { name: 'קאווה פרוסקו שפריץ', description: 'כוס', ingredients: 'יין מבעבע קאווה עם שפריץ', price: 49, category: 'יין ומבעבעים', course: 'drink', allergens: ['סולפיטים'] },
      { name: 'שאטו דה מירבאל (כשר)', description: 'בקבוק בלבד', ingredients: 'יין בקבוק, כשר', price: 279, category: 'יין ומבעבעים', course: 'drink', allergens: ['סולפיטים'] },
      // ---- קוקטיילים ----
      { name: 'ניגרוני', price: 56, category: 'קוקטיילים', course: 'drink' },
      { name: 'מוחיטו', price: 56, category: 'קוקטיילים', course: 'drink' },
      { name: 'מרגריטה', description: 'טקילה בלנקו, מונין אגבה ולימון', ingredients: 'טקילה בלנקו, מונין אגבה ולימון', price: 56, category: 'קוקטיילים', course: 'drink' },
      { name: 'אפרול שפריץ', price: 56, category: 'קוקטיילים', course: 'drink' },
      { name: 'אבטיח-בול', description: 'וודקה סמירנוף, מונין אשכולית אדומה, נענע, רדבול ואבטיח', ingredients: 'וודקה סמירנוף, מונין אשכולית אדומה, נענע, רדבול ואבטיח', price: 56, category: 'קוקטיילים', course: 'drink' },
      { name: 'טרופיקנה', description: 'קפטן מורגן ספייסד, מונין מנגו, מיץ אננס ולימון', ingredients: 'קפטן מורגן ספייסד, מונין מנגו, מיץ אננס ולימון', price: 56, category: 'קוקטיילים', course: 'drink' },
      { name: 'זאוס', description: 'ויסקי רד לייבל, מונין וניל ושקדים, לימון', ingredients: 'ויסקי רד לייבל, מונין וניל ושקדים, לימון', price: 56, category: 'קוקטיילים', course: 'drink' },
      { name: 'הענק הירוק', description: 'ג׳ין גורדונס, ורמוט, קיווי ולימון', ingredients: 'ג׳ין גורדונס, ורמוט, קיווי ולימון', price: 56, category: 'קוקטיילים', course: 'drink' },
      { name: 'אפרודיטה', description: 'וודקה סמירנוף, אפרול, מונין אשכולית אדומה ולימון', ingredients: 'וודקה סמירנוף, אפרול, מונין אשכולית אדומה ולימון', price: 56, category: 'קוקטיילים', course: 'drink' },
      { name: 'אנים', description: 'ערק שליט, מונין ליצ׳י, מיץ אננס ולימון', ingredients: 'ערק שליט, מונין ליצ׳י, מיץ אננס ולימון', price: 56, category: 'קוקטיילים', course: 'drink' },
      { name: 'פאלומה קוקטייל', description: 'טקילה אספלון בלנקו, אשכולית אדומה, לימון ונענע', ingredients: 'טקילה אספלון בלנקו, אשכולית אדומה, לימון ונענע', price: 56, category: 'קוקטיילים', course: 'drink' },
      { name: '10 צ׳ייסרים', description: 'וודקה סמירנוף | ויסקי בלונדי | טקילה אספלון | ג׳ין גורדונס | ערק | קמפרי | פיג׳ | טובי 60', ingredients: 'וודקה סמירנוף, ויסקי בלונדי, טקילה אספלון, ג׳ין גורדונס, ערק, קמפרי, פיג׳, טובי 60 — 10 צ׳ייסרים לשולחן', price: 189, category: 'קוקטיילים', course: 'drink' },
      // ---- בקטנה ----
      { name: 'עלי גפן', price: 36, category: 'בקטנה', course: 'starter' },
      { name: 'זיתים פרובאנס וחמוצים', price: 19, category: 'בקטנה', course: 'starter' },
      { name: 'אדממה', price: 41, category: 'בקטנה', course: 'starter' },
      { name: 'צ׳יפס מתובל', description: 'תיבול של שום ואורגנו', ingredients: 'תפוחי אדמה, תיבול שום ואורגנו', price: 38, category: 'בקטנה', course: 'starter' },
      { name: 'צלחת ירקות', description: 'גזר, מלפפון, שרי, גמבה, קולורבי, לצד ויניגרט', ingredients: 'גזר, מלפפון, עגבניות שרי, גמבה, קולורבי, רוטב ויניגרט', price: 42, category: 'בקטנה', course: 'starter' },
      { name: 'צ׳יפס עם בולגרית', ingredients: 'תפוחי אדמה, גבינת בולגרית', price: 48, category: 'בקטנה', course: 'starter', allergens: ['חלב'] },
      { name: 'נאצ׳וס', description: 'מוגש לצד רוטב סלסה', ingredients: 'צ׳יפס תירס, רוטב סלסה', price: 29, category: 'בקטנה', course: 'starter' },
      { name: 'כדורי פירה', description: 'מוגש לצד רוטב ספייסי מיונז', ingredients: 'תפוחי אדמה, רוטב ספייסי מיונז', price: 36, category: 'בקטנה', course: 'starter', spicy: true },
      { name: 'פוקאצ׳ה מטבלים', description: 'מוגש לצד מטבל שום עגבניות, שמן קונפי זית ובלסמי', ingredients: 'פוקאצ׳ה, מטבל שום עגבניות, שמן קונפי זית, בלסמי', price: 29, category: 'בקטנה', course: 'starter', allergens: ['גלוטן'] },
      // ---- סלטים ----
      { name: 'סלט קיסר', description: 'חסה קיסר, קרוטונים, פרמזן והרוטב המפורסם על בסיס אנשובי עדין', ingredients: 'חסה קיסר, קרוטונים, פרמזן, רוטב על בסיס אנשובי', price: 49, category: 'סלטים', course: 'starter', allergens: ['דגים', 'חלב', 'גלוטן'] },
      { name: 'סלט יווני', description: 'עגבניות שרי, מלפפון, בצל, זיתי קלמטה, שמן זית, זעתר ובולגרית', ingredients: 'עגבניות שרי, מלפפון, בצל, זיתי קלמטה, שמן זית, זעתר, גבינת בולגרית', price: 49, category: 'סלטים', course: 'starter', allergens: ['חלב'] },
      // ---- בגדולה ----
      { name: 'נקניקיות ברזילאיות + צ׳יפס', description: '3 יח׳ נקניקיות ברזילאיות (עגל), מוגשות לצד ציפס מתובל וכרוב כבוש', ingredients: '3 יח׳ נקניקיות ברזילאיות (עגל), ציפס מתובל, כרוב כבוש', price: 52, category: 'בגדולה', course: 'main' },
      { name: 'שניצלונים וצ׳יפס', description: 'שניצלונים ביתיים בעבודת יד', ingredients: 'שניצלונים ביתיים בעבודת יד, ציפס', price: 66, category: 'בגדולה', course: 'main', allergens: ['גלוטן', 'ביצים'] },
      { name: 'המבורגר הבית וצ׳יפס', description: 'המבורגר 220 גר׳ עם ציפס. תוספת ביצת עין ב-6₪', ingredients: 'בקר טחון 220 גר׳, לחמניה, ציפס (אפשרות לתוספת ביצת עין)', price: 68, category: 'בגדולה', course: 'main', allergens: ['גלוטן'] },
      { name: 'פיצה מרגריטה', description: 'גבינת מוצרלה עם זיתי קלמטה ועלי רוקט', ingredients: 'בצק פיצה, גבינת מוצרלה, זיתי קלמטה, עלי רוקט', price: 46, category: 'בגדולה', course: 'main', allergens: ['גלוטן', 'חלב'] },
      { name: 'קרפצ׳יו פילה בקר', description: 'מוגש עם לחם קסטן, רוקט, בלסמי ושמן זית', ingredients: 'פילה בקר פרוס דק, לחם קסטן, רוקט, בלסמי, שמן זית', price: 58, category: 'בגדולה', course: 'main', allergens: ['גלוטן'] },
      { name: 'כריך ניו יורקי', description: 'סנדוויץ׳ קורנביף 160 גרם בלחם קסטן, חסה, עגבניה, חרדל דיז׳ון, לצד מלפפון חמוץ', ingredients: 'קורנביף 160 גרם, לחם קסטן, חסה, עגבניה, חרדל דיז׳ון, מלפפון חמוץ', price: 65, category: 'בגדולה', course: 'main', allergens: ['גלוטן', 'חרדל'] },
      // ---- מתוקים ----
      { name: 'אבטיח בולגרית', ingredients: 'אבטיח, גבינת בולגרית', price: 42, category: 'מתוקים', course: 'dessert', allergens: ['חלב'] },
      { name: 'טירמיסו', ingredients: 'מסקרפונה, ביסקוטי ספוג בקפה, קקאו', price: 41, category: 'מתוקים', course: 'dessert', allergens: ['חלב', 'ביצים', 'גלוטן'] },
      { name: 'קראק פאי', description: 'מוגש עם גלידת וניל', ingredients: 'עוגת קראק, גלידת וניל', price: 45, category: 'מתוקים', course: 'dessert', allergens: ['חלב', 'ביצים', 'גלוטן'] },
    ];
    for (const item of items) models.addMenuItem(item);
  }
}

module.exports = { seedIfEmpty };
