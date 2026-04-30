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
const AvatarLibrarian = require('@/assets/images/profile/avatars/av-10-librarian.png');
const AvatarTeacher = require('@/assets/images/profile/avatars/av-11-teacher.png');
const AvatarAstronomer = require('@/assets/images/profile/avatars/av-12-astronomer.png');
const AvatarCartographer = require('@/assets/images/profile/avatars/av-13-cartographer.png');
const AvatarScribe = require('@/assets/images/profile/avatars/av-14-scribe.png');
const AvatarInventor = require('@/assets/images/profile/avatars/av-15-inventor.png');
const AvatarPoet = require('@/assets/images/profile/avatars/av-16-poet.png');
const AvatarStoryteller = require('@/assets/images/profile/avatars/av-17-storyteller.png');
const AvatarNavigator = require('@/assets/images/profile/avatars/av-18-navigator.png');
const AvatarScholar = require('@/assets/images/profile/avatars/av-19-scholar.png');

// Map by local avatar ID (from AvatarSelectorSheet) AND old Supabase image_url keys
const AVATAR_IMAGE_MAP: Record<string, any> = {
  // Local IDs (from avatar selector)
  architect: AvatarArchitect,
  musician: AvatarMusician,
  lamplighter: AvatarLamplighter,
  reader: AvatarReader,
  explorer: AvatarExplorer,
  physician: AvatarPhysician,
  elder: AvatarElder,
  apothecary: AvatarApothecary,
  merchant: AvatarMerchant,
  librarian: AvatarLibrarian,
  teacher: AvatarTeacher,
  astronomer: AvatarAstronomer,
  cartographer: AvatarCartographer,
  scribe: AvatarScribe,
  inventor: AvatarInventor,
  poet: AvatarPoet,
  storyteller: AvatarStoryteller,
  navigator: AvatarNavigator,
  scholar: AvatarScholar,
  // New Supabase image_url keys (from unlockable_items table)
  'avatars/av-01-architect.png': AvatarArchitect,
  'avatars/av-02-musician.png': AvatarMusician,
  'avatars/av-03-lamplighter.png': AvatarLamplighter,
  'avatars/av-04-reader.png': AvatarReader,
  'avatars/av-05-explorer.png': AvatarExplorer,
  'avatars/av-06-physician.png': AvatarPhysician,
  'avatars/av-07-elder.png': AvatarElder,
  'avatars/av-08-apothecary.png': AvatarApothecary,
  'avatars/av-09-merchant.png': AvatarMerchant,
  'avatars/av-10-librarian.png': AvatarLibrarian,
  'avatars/av-11-teacher.png': AvatarTeacher,
  'avatars/av-12-astronomer.png': AvatarAstronomer,
  'avatars/av-13-cartographer.png': AvatarCartographer,
  'avatars/av-14-scribe.png': AvatarScribe,
  'avatars/av-15-inventor.png': AvatarInventor,
  'avatars/av-16-poet.png': AvatarPoet,
  'avatars/av-17-storyteller.png': AvatarStoryteller,
  'avatars/av-18-navigator.png': AvatarNavigator,
  'avatars/av-19-scholar.png': AvatarScholar,
  // Old Supabase image_url keys (backward compat)
  'avatars/Al-Khwarizmi.png': AvatarReader,
  'avatars/Fatima-al-Fihri.png': AvatarArchitect,
  'avatars/ibn-sina-avicenna.png': AvatarPhysician,
  'avatars/Ziryab.png': AvatarMusician,
  'avatars/Al-Razi.png': AvatarElder,
  'avatars/Ibn-Battuta.png': AvatarExplorer,
  'avatars/Lubna-of-Cordoba.png': AvatarLamplighter,
  'avatars/Mariam-al-Asturlabi.png': AvatarAstronomer,
  'avatars/Zaynab-al-Shahda.png': AvatarScholar,
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
