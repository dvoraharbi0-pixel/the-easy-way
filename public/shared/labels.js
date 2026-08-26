const COURSE_LABELS = {
  drink: 'שתייה קלה',
  alcohol: 'אלכוהול',
  cocktails: 'קוקטיילים',
  starter: 'ראשונות',
  main: 'עיקריות',
  dessert: 'קינוחים',
};
const COURSE_ORDER = ['starter', 'main', 'dessert', 'cocktails', 'alcohol', 'drink'];
const COURSE_ICON = { drink: '🥤', alcohol: '🍸', cocktails: '🍹', starter: '🥗', main: '🍽️', dessert: '🍰' };

// Which prep station handles each course — the kitchen preps food, the bar
// preps every kind of drink, and the kitchen/bar/waiter screens all filter
// by this.
const COURSE_STATION = { drink: 'bar', alcohol: 'bar', cocktails: 'bar', starter: 'kitchen', main: 'kitchen', dessert: 'kitchen' };
const STATION_LABELS = { kitchen: '🍽️ מטבח', bar: '🍹 בר' };

const STATUS_LABELS = {
  in_cart: 'בעגלה',
  sent: 'נשלח למטבח',
  preparing: 'בהכנה',
  ready: 'מוכן להגשה',
  served: 'הוגש',
  cancelled: 'בוטל',
  removed: 'הוסרה מהעגלה',
};

function money(n) {
  return `₪${Number(n).toFixed(0)}`;
}

const TIP_PRESETS = [10, 12, 15, 20];

// Shown to diners instead of the real kitchen status, so "ready" doesn't leak
// early and the wait feels a little less like watching a pot.
const COOKING_MESSAGES = [
  '👨‍🍳 השף כבר על זה',
  '🔥 מתבשל באהבה',
  '🥘 מכינים במיוחד בשבילכם',
  '✨ כמעט כמעט',
  '🍳 עובדים על זה במטבח',
  '⏳ עוד ממש רגע',
];
