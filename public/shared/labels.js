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
