// Static asset maps shared across the Profile tab.
// Keep these out of the screen file so the React reconciler doesn't churn
// over a 70+ entry literal map every render.

const DefaultAvatar = require('@/assets/images/profile/icons/profile-avatar.png');
const AvatarArchitect = require('@/assets/images/profile/avatars/av-01-architect.png');
const AvatarMusician = require('@/assets/images/profile/avatars/av-02-musician.png');
const AvatarLamplighter = require('@/assets/images/profile/avatars/av-03-lamplighter.png');
const AvatarReader = require('@/assets/images/profile/avatars/av-04-reader.png');
const AvatarExplorer = require('@/assets/images/profile/avatars/av-05-explorer.png');
const AvatarPhysician = require('@/assets/images/profile/avatars/av-06-physician.png');
const AvatarElder = require('@/assets/images/profile/avatars/av-07-elder.png');
const AvatarApothecary = require('@/assets/images/profile/avatars/av-08-apothecary.png');
const AvatarMerchant = require('@/assets/images/profile/avatars/av-09-merchant.png');

// Map old Supabase image_url keys to new v5 avatars
const AVATAR_IMAGE_MAP: Record<string, any> = {
  'avatars/Al-Khwarizmi.png': AvatarArchitect,
  'avatars/Fatima-al-Fihri.png': AvatarReader,
  'avatars/ibn-sina-avicenna.png': AvatarPhysician,
  'avatars/Ziryab.png': AvatarMusician,
  'avatars/Al-Razi.png': AvatarApothecary,
  'avatars/Ibn-Battuta.png': AvatarExplorer,
  'avatars/Lubna-of-Cordoba.png': AvatarLamplighter,
  'avatars/Mariam-al-Asturlabi.png': AvatarElder,
  'avatars/Zaynab-al-Shahda.png': AvatarMerchant,
};

export const getAvatarImage = (imageUrl: string) =>
  AVATAR_IMAGE_MAP[imageUrl] || DefaultAvatar;

const BADGE_IMAGE_MAP: Record<string, any> = {
  'ACH_MonthlyActive_1.png': require('@/assets/images/profile/badges/badge-january-scholar.png'),
  'ACH_MonthlyActive_2.png': require('@/assets/images/profile/badges/badge-february-caravan.png'),
  'ACH_MonthlyActive_3.png': require('@/assets/images/profile/badges/badge-march-astronomer.png'),
  'ACH_MonthlyActive_4.png': require('@/assets/images/profile/badges/badge-april-calligrapher.png'),
  'ACH_MonthlyActive_5.png': require('@/assets/images/profile/badges/badge-may-architect.png'),
  'ACH_MonthlyActive_6.png': require('@/assets/images/profile/badges/badge-june-healer.png'),
  'ACH_MonthlyActive_7.png': require('@/assets/images/profile/badges/badge-july-cartographer.png'),
  'ACH_MonthlyActive_8.png': require('@/assets/images/profile/badges/badge-august-sailor.png'),
  'ACH_MonthlyActive_9.png': require('@/assets/images/profile/badges/badge-september-wayfinder.png'),
  'ACH_MonthlyActive_10.png': require('@/assets/images/profile/badges/badge-october-oasis.png'),
  'ACH_MonthlyActive_11.png': require('@/assets/images/profile/badges/badge-november-lantern.png'),
  'ACH_MonthlyActive_12.png': require('@/assets/images/profile/badges/badge-december-storyteller.png'),
};

export const getBadgeImage = (imagePath: string) => BADGE_IMAGE_MAP[imagePath];

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
