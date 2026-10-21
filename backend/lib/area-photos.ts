/**
 * Photos for the district cards (Unsplash; sources and licences in
 * docs/image-assets.json, downloaded by `npm run photos:site`). All were taken
 * in Baku. Only Səbail and Nərimanov show recognisable places inside those
 * districts (the Maiden Tower, the Heydar Aliyev Center); the others are general Baku
 * residential streets, and their alt text says so rather than naming a place.
 */
export const DISTRICT_PHOTOS: Record<string, { src: string; alt: { az: string; en: string } }> = {
  sebail: { src: "/images/district-sebail-02.jpg", alt: { az: "İçərişəhərdə Qız qalası", en: "The Maiden Tower in Icherisheher" } },
  nerimanov: { src: "/images/district-nerimanov-02.jpg", alt: { az: "Heydər Əliyev Mərkəzi", en: "Heydar Aliyev Center" } },
  nesimi: { src: "/images/district-nesimi.jpg", alt: { az: "Bakı mərkəzində tarixi bina", en: "A historic building in central Baku" } },
  yasamal: { src: "/images/district-yasamal.jpg", alt: { az: "Bakıda çoxmərtəbəli yaşayış binası", en: "A residential block in Baku" } },
  xetai: { src: "/images/district-xetai.jpg", alt: { az: "Bakıda müasir yaşayış binaları", en: "Modern apartment buildings in Baku" } },
  nizami: { src: "/images/district-nizami.jpg", alt: { az: "Bakıda sakit küçə", en: "A quiet street in Baku" } },
  binegedi: { src: "/images/district-binegedi.jpg", alt: { az: "Eyvanlı yaşayış binası", en: "An apartment building with balconies" } },
};

/** Illustrative interiors (stock photos, not listed properties). The hero is 3840×2560. */
export const HERO_PHOTO = { src: "/images/roomhub-hero-apartment.jpg" };
export const SAFETY_PHOTO = { src: "/images/lifestyle-living-room-01.jpg" };
export const AUTH_PHOTO = { src: "/images/apartment-bedroom-01.jpg" };
