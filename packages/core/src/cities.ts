import type { ContentLocaleNames } from './localized'
import type { GeoPoint } from './geo'

export interface IsraelCity extends GeoPoint {
  slug: string
  names: ContentLocaleNames
}

export const ISRAEL_CITIES: readonly IsraelCity[] = [
  {
    slug: 'tel-aviv',
    lat: 32.0853,
    lng: 34.7818,
    names: { he: 'תל אביב-יפו', es: 'Tel Aviv-Yafo', en: 'Tel Aviv-Yafo', ru: 'Тель-Авив-Яффо' },
  },
  {
    slug: 'jerusalem',
    lat: 31.7683,
    lng: 35.2137,
    names: { he: 'ירושלים', es: 'Jerusalén', en: 'Jerusalem', ru: 'Иерусалим' },
  },
  {
    slug: 'haifa',
    lat: 32.794,
    lng: 34.9896,
    names: { he: 'חיפה', es: 'Haifa', en: 'Haifa', ru: 'Хайфа' },
  },
  {
    slug: 'beer-sheva',
    lat: 31.252,
    lng: 34.7915,
    names: { he: 'באר שבע', es: 'Beerseba', en: 'Beersheba', ru: 'Беэр-Шева' },
  },
  {
    slug: 'eilat',
    lat: 29.5577,
    lng: 34.9519,
    names: { he: 'אילת', es: 'Eilat', en: 'Eilat', ru: 'Эйлат' },
  },
  {
    slug: 'netanya',
    lat: 32.3215,
    lng: 34.8532,
    names: { he: 'נתניה', es: 'Netanya', en: 'Netanya', ru: 'Нетания' },
  },
  {
    slug: 'ashdod',
    lat: 31.8044,
    lng: 34.6553,
    names: { he: 'אשדוד', es: 'Ashdod', en: 'Ashdod', ru: 'Ашдод' },
  },
  {
    slug: 'rishon-lezion',
    lat: 31.973,
    lng: 34.7925,
    names: { he: 'ראשון לציון', es: 'Rishon LeZion', en: 'Rishon LeZion', ru: 'Ришон-ле-Цион' },
  },
  {
    slug: 'petah-tikva',
    lat: 32.0871,
    lng: 34.8875,
    names: { he: 'פתח תקווה', es: 'Petaj Tikva', en: 'Petah Tikva', ru: 'Петах-Тиква' },
  },
  {
    slug: 'herzliya',
    lat: 32.1624,
    lng: 34.8447,
    names: { he: 'הרצליה', es: 'Herzliya', en: 'Herzliya', ru: 'Герцлия' },
  },
  {
    slug: 'kfar-saba',
    lat: 32.175,
    lng: 34.9069,
    names: { he: 'כפר סבא', es: 'Kfar Saba', en: 'Kfar Saba', ru: 'Кфар-Саба' },
  },
  {
    slug: 'raanana',
    lat: 32.1848,
    lng: 34.8713,
    names: { he: 'רעננה', es: "Ra'anana", en: "Ra'anana", ru: 'Раанана' },
  },
  {
    slug: 'rehovot',
    lat: 31.8928,
    lng: 34.8113,
    names: { he: 'רחובות', es: 'Rehovot', en: 'Rehovot', ru: 'Реховот' },
  },
  {
    slug: 'modiin',
    lat: 31.8969,
    lng: 35.0104,
    names: { he: 'מודיעין', es: "Modi'in", en: "Modi'in", ru: 'Модиин' },
  },
  {
    slug: 'hadera',
    lat: 32.434,
    lng: 34.9196,
    names: { he: 'חדרה', es: 'Hadera', en: 'Hadera', ru: 'Хадера' },
  },
  {
    slug: 'zichron-yaakov',
    lat: 32.5722,
    lng: 34.9519,
    names: { he: 'זכרון יעקב', es: 'Zijron Yaakov', en: "Zikhron Ya'akov", ru: 'Зихрон-Яаков' },
  },
  {
    slug: 'tiberias',
    lat: 32.7922,
    lng: 35.5312,
    names: { he: 'טבריה', es: 'Tiberíades', en: 'Tiberias', ru: 'Тверия' },
  },
  {
    slug: 'nahariya',
    lat: 33.0089,
    lng: 35.0981,
    names: { he: 'נהריה', es: 'Nahariya', en: 'Nahariya', ru: 'Нагария' },
  },
  {
    slug: 'kiryat-shmona',
    lat: 33.2079,
    lng: 35.5702,
    names: { he: 'קריית שמונה', es: 'Kiryat Shmona', en: 'Kiryat Shmona', ru: 'Кирьят-Шмона' },
  },
]

export function findCity(slug: string): IsraelCity | undefined {
  return ISRAEL_CITIES.find((city) => city.slug === slug)
}
