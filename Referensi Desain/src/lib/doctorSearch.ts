import { conditions, doctors, specialtyCategories, type Doctor } from "../data/medicalDirectory";

export type DoctorFilters = {
  query: string;
  specialty: string;
  city: string;
  language: string;
  ageGroup: string;
  mode: string;
  maxFee: number;
  minExperience: number;
  available: boolean;
  availableDate: string;
  verifiedOnly: boolean;
  insuranceOnly: boolean;
};

export const defaultDoctorFilters: DoctorFilters = {
  query: "",
  specialty: "All specialties",
  city: "All locations",
  language: "All languages",
  ageGroup: "All age groups",
  mode: "Any consultation",
  maxFee: 2000,
  minExperience: 0,
  available: false,
  availableDate: "Any date",
  verifiedOnly: false,
  insuranceOnly: false,
};

export function yearsOfExperience(doctor: Doctor, year = new Date().getFullYear()) {
  return Math.max(0, year - doctor.careerStart);
}

export function doctorSearchText(doctor: Doctor) {
  const conditionNames = doctor.conditions.map((slug) => conditions.find((condition) => condition.slug === slug)?.name ?? slug);
  return [
    doctor.name,
    doctor.primarySpecialty,
    ...doctor.additionalSpecialties,
    ...conditionNames,
    ...doctor.services,
    doctor.clinic,
    doctor.city,
    ...doctor.languages,
  ].join(" ").toLowerCase();
}

export function searchDoctors(filters: DoctorFilters, source = doctors) {
  const query = filters.query.trim().toLowerCase();
  return source.filter((doctor) => {
    if (query && !doctorSearchText(doctor).includes(query)) return false;
    if (filters.specialty !== "All specialties" && doctor.primarySpecialty !== filters.specialty && !doctor.additionalSpecialties.includes(filters.specialty)) return false;
    if (filters.city !== "All locations" && doctor.city !== filters.city) return false;
    if (filters.language !== "All languages" && !doctor.languages.includes(filters.language)) return false;
    if (filters.ageGroup !== "All age groups" && !doctor.ageGroups.includes(filters.ageGroup)) return false;
    if (filters.mode !== "Any consultation" && !doctor.modes.includes(filters.mode as "Video" | "In-person")) return false;
    if (doctor.fee > filters.maxFee) return false;
    if (yearsOfExperience(doctor) < filters.minExperience) return false;
    if (filters.available && doctor.availability.length === 0) return false;
    if (filters.availableDate !== "Any date" && !doctor.availability.some((slot) => slot.startsWith(filters.availableDate))) return false;
    if (filters.verifiedOnly && doctor.verification !== "Verified") return false;
    if (filters.insuranceOnly && !doctor.acceptedInsurance?.length) return false;
    return true;
  });
}

export function discoveryReasons(query: string, doctor: Doctor) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  const matchedCondition = conditions.find((condition) =>
    [condition.name, ...condition.aliases].some((value) => value.toLowerCase().includes(normalized) || normalized.includes(value.toLowerCase())),
  );
  if (matchedCondition && doctor.conditions.includes(matchedCondition.slug)) {
    return [`Lists ${matchedCondition.name} among this fictional profile's configured expertise`];
  }
  if ([doctor.primarySpecialty, ...doctor.additionalSpecialties].some((specialty) => specialty.toLowerCase().includes(normalized))) {
    return [`Specialty matches “${query.trim()}”`];
  }
  if (doctor.services.some((service) => service.toLowerCase().includes(normalized))) {
    return [`Service information includes “${query.trim()}”`];
  }
  return [];
}

export function suggestedSpecialties(query: string) {
  const normalized = query.trim().toLowerCase();
  const condition = conditions.find((item) =>
    [item.name, ...item.aliases].some((value) => value.toLowerCase().includes(normalized) || normalized.includes(value.toLowerCase())),
  );
  if (condition) return condition.specialties;
  const category = specialtyCategories.find((item) =>
    [item.name, item.shortName, ...item.conditions].some((value) => value.toLowerCase().includes(normalized) || normalized.includes(value.toLowerCase())),
  );
  return category?.specialties.slice(0, 4) ?? [];
}
