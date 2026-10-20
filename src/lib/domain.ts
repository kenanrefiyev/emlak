// Pure domain constants shared by server and client (no Prisma runtime import).

export const LISTING_CATEGORIES = [
  "PRIVATE_ROOM",
  "SHARED_APARTMENT",
  "ENTIRE_APARTMENT",
  "DORMITORY",
  "FAMILY_APARTMENT",
] as const;
export type ListingCategory = (typeof LISTING_CATEGORIES)[number];

export const SEGMENTS = {
  students: ["PRIVATE_ROOM", "SHARED_APARTMENT", "DORMITORY", "ENTIRE_APARTMENT"],
  family: ["FAMILY_APARTMENT", "ENTIRE_APARTMENT"],
} as const satisfies Record<string, readonly ListingCategory[]>;
export type Segment = keyof typeof SEGMENTS;

/** Categories where a listing is a place inside a shared home. */
export const SHARED_CATEGORIES: readonly ListingCategory[] = ["PRIVATE_ROOM", "SHARED_APARTMENT", "DORMITORY"];
/** Categories where the whole unit is rented. */
export const WHOLE_UNIT_CATEGORIES: readonly ListingCategory[] = ["ENTIRE_APARTMENT", "FAMILY_APARTMENT"];

export const LISTING_STATUSES = ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "REJECTED", "RENTED", "ARCHIVED"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const ROOMMATE_STATUSES = ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "REJECTED", "CLOSED", "ARCHIVED"] as const;
export type RoommateStatus = (typeof ROOMMATE_STATUSES)[number];

export const FURNISHING = ["FURNISHED", "PARTLY", "UNFURNISHED"] as const;
export const UTILITIES = ["INCLUDED", "PARTLY", "NOT_INCLUDED"] as const;
export const HEATING = ["CENTRAL", "COMBI", "ELECTRIC", "NONE"] as const;
export const GENDER_PREFS = ["ANY", "FEMALE", "MALE"] as const;
export const COMMISSION_TYPES = ["NONE", "PERCENT", "FIXED"] as const;
export const ROOMMATE_TYPES = ["HAS_PLACE", "SEEKING_PARTNER"] as const;
export type RoommateType = (typeof ROOMMATE_TYPES)[number];
export const SMOKING = ["NO_SMOKING", "OUTSIDE_ONLY", "ALLOWED"] as const;
export const CLEANING = ["ROTA", "EACH_OWN", "HIRED_HELP", "FLEXIBLE"] as const;
export const SLEEP = ["EARLY", "LATE", "FLEXIBLE"] as const;
export const GUESTS = ["RARELY", "SOMETIMES", "OFTEN"] as const;
export const CONTACT_PREFS = ["IN_APP", "PHONE", "WHATSAPP"] as const;
export const REPORT_REASONS = [
  "FAKE",
  "SCAM",
  "WRONG_PRICE",
  "ALREADY_RENTED",
  "OFFENSIVE",
  "DISCRIMINATION",
  "SPAM",
  "OTHER",
] as const;

export const LISTING_SORTS = ["newest", "price_asc", "price_desc"] as const;
export type ListingSort = (typeof LISTING_SORTS)[number];

export const PAGE_SIZE = 12;
export const MAX_IMAGES = 12;
/** Days a published listing / roommate ad stays live before it must be renewed. */
export const LISTING_TTL_DAYS = 60;
export const ROOMMATE_TTL_DAYS = 30;
export const PRICE_MIN = 30;
export const PRICE_MAX = 20000;

/** Languages a landlord or agent can list on their profile. */
export const SPOKEN_LANGUAGES = ["az", "tr", "ru", "en", "de", "fr", "ar", "fa"] as const;

export const PROPERTY_TYPES = ["APARTMENT", "HOUSE"] as const;
