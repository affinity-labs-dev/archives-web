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

// ── Achievement images ──────────────────────────────────────────────
// Locked + unlocked variants are pre-rendered (handled by the designer
// per piece) rather than runtime grayscale-filtered. Both maps are
// keyed by the orchestrator's achievement.id so a single id passed
// through getAchievementImage(id, unlocked) resolves to the right
// pixel-perfect asset for either state. Used by AchievementsScreen
// (full grid) AND the ProfileAchievements preview row, so any new
// achievement only needs adding here in one place.

const ACHIEVEMENT_IMAGES_UNLOCKED: Record<string, any> = {
  perfect_scholar: require('@/assets/images/adventure-unlocked/perfectscholar.png'),
  quiz_legend: require('@/assets/images/adventure-unlocked/quizlegend.png'),
  quiz_master: require('@/assets/images/adventure-unlocked/quizmaster.png'),
  first_perfect: require('@/assets/images/adventure-unlocked/firststeps.png'),
  century_scholar: require('@/assets/images/adventure-unlocked/100dayscholar.png'),
  quick_learner: require('@/assets/images/adventure-unlocked/quicklearner.png'),
  speed_demon: require('@/assets/images/adventure-unlocked/speeddemon.png'),
  week_warrior: require('@/assets/images/adventure-unlocked/weekwarrior.png'),
  month_master: require('@/assets/images/adventure-unlocked/monthmaster.png'),
  early_bird: require('@/assets/images/adventure-unlocked/earlybird.png'),
  night_owl: require('@/assets/images/adventure-unlocked/nightowl.png'),
  era_complete_umayyad: require('@/assets/images/adventure-unlocked/umayyadexpert.png'),
  era_complete_women_of_islam: require('@/assets/images/adventure-unlocked/womenofislam.png'),
  era_complete_roi: require('@/assets/images/adventure-unlocked/riseofislam.png'),
  xp_100: require('@/assets/images/adventure-unlocked/talib(seeker).png'),
  xp_250: require('@/assets/images/adventure-unlocked/daris(student).png'),
  xp_500: require('@/assets/images/adventure-unlocked/alim(scholar).png'),
  xp_1000: require('@/assets/images/adventure-unlocked/hakim(sage).png'),
  xp_2000: require('@/assets/images/adventure-unlocked/ustadh(master).png'),
  xp_3500: require('@/assets/images/adventure-unlocked/shaykhalilm.png'),
};

const ACHIEVEMENT_IMAGES_LOCKED: Record<string, any> = {
  perfect_scholar: require('@/assets/images/adventure-locked/perfectscholar.png'),
  quiz_legend: require('@/assets/images/adventure-locked/quizlegend.png'),
  quiz_master: require('@/assets/images/adventure-locked/quizmaster.png'),
  first_perfect: require('@/assets/images/adventure-locked/firststeps.png'),
  century_scholar: require('@/assets/images/adventure-locked/100dayscholar.png'),
  quick_learner: require('@/assets/images/adventure-locked/quicklearner.png'),
  speed_demon: require('@/assets/images/adventure-locked/speeddemon.png'),
  week_warrior: require('@/assets/images/adventure-locked/weekwarrior.png'),
  month_master: require('@/assets/images/adventure-locked/monthmaster.png'),
  early_bird: require('@/assets/images/adventure-locked/earlybird.png'),
  night_owl: require('@/assets/images/adventure-locked/nightowl.png'),
  era_complete_umayyad: require('@/assets/images/adventure-locked/umayyadexpert.png'),
  era_complete_women_of_islam: require('@/assets/images/adventure-locked/womenofislam.png'),
  era_complete_roi: require('@/assets/images/adventure-locked/riseofislam.png'),
  xp_100: require('@/assets/images/adventure-locked/talib(seeker).png'),
  xp_250: require('@/assets/images/adventure-locked/daris(student).png'),
  xp_500: require('@/assets/images/adventure-locked/alim(scholar).png'),
  xp_1000: require('@/assets/images/adventure-locked/hakim(sage).png'),
  xp_2000: require('@/assets/images/adventure-locked/ustadh(master).png'),
  xp_3500: require('@/assets/images/adventure-locked/shaykhalilm.png'),
};

export const getAchievementImage = (id: string, unlocked: boolean) =>
  unlocked
    ? ACHIEVEMENT_IMAGES_UNLOCKED[id]
    : ACHIEVEMENT_IMAGES_LOCKED[id];

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
