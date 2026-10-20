import type { AppLocale } from "@/i18n/routing";

/** Reference rows carry one name column per public locale. */
export interface LocalizedNames {
  nameAz: string;
  nameTr: string;
  nameRu: string;
  nameEn: string;
}

export function nameOf(row: LocalizedNames, locale: AppLocale): string {
  switch (locale) {
    case "tr":
      return row.nameTr || row.nameAz;
    case "ru":
      return row.nameRu || row.nameAz;
    case "en":
      return row.nameEn || row.nameAz;
    default:
      return row.nameAz;
  }
}

export const nameSelect = { nameAz: true, nameTr: true, nameRu: true, nameEn: true } as const;
