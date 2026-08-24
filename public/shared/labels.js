const COURSE_LABELS = {
  drink: 'שתייה',
  starter: 'ראשונות',
  main: 'עיקריות',
  dessert: 'קינוחים',
};
const COURSE_ORDER = ['drink', 'starter', 'main', 'dessert'];
const COURSE_ICON = { drink: '🥤', starter: '🥗', main: '🍽️', dessert: '🍰' };

const STATUS_LABELS = {
  in_cart: 'בעגלה',
  sent: 'נשלח למטבח',
  preparing: 'בהכנה',
  ready: 'מוכן להגשה',
  served: 'הוגש',
  cancelled: 'בוטל',
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
