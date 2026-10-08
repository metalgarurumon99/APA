import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { conditions, doctors } from "../data/medicalDirectory";
import { defaultDoctorFilters, discoveryReasons, searchDoctors, suggestedSpecialties, yearsOfExperience } from "./doctorSearch";

describe("doctor discovery", () => {
  it("maps diabetes to transparent, non-exclusive specialty suggestions", () => {
    expect(suggestedSpecialties("diabetes")).toEqual(
      expect.arrayContaining(["Endocrinologist", "Diabetologist", "General Physician"]),
    );
  });

  it("searches configured conditions, services, clinics, and specialties", () => {
    const results = searchDoctors({ ...defaultDoctorFilters, query: "diabetes" });
    expect(results.map((doctor) => doctor.id)).toEqual(expect.arrayContaining(["anaya-rao", "rohan-gupta"]));
    expect(discoveryReasons("diabetes", results[0])[0]).toContain("configured expertise");
  });

  it("combines fee, language, mode, location, and experience filters", () => {
    const results = searchDoctors({
      ...defaultDoctorFilters,
      city: "New Delhi",
      language: "Hindi",
      mode: "Video",
      maxFee: 1000,
      minExperience: 5,
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((doctor) =>
      doctor.city === "New Delhi" &&
      doctor.languages.includes("Hindi") &&
      doctor.modes.includes("Video") &&
      doctor.fee <= 1000 &&
      yearsOfExperience(doctor) >= 5
    )).toBe(true);
  });

  it("never marks fictional profiles as verified or gives them ratings", () => {
    expect(doctors.every((doctor) => doctor.verification !== "Verified")).toBe(true);
    expect(doctors.every((doctor) => !("rating" in doctor))).toBe(true);
  });

  it("links every configured doctor condition to structured educational content", () => {
    const slugs = new Set(conditions.map((condition) => condition.slug));
    expect(doctors.flatMap((doctor) => doctor.conditions).every((slug) => slugs.has(slug))).toBe(true);
  });
});

describe("database security and booking contracts", () => {
  const migration = readFileSync("supabase/migrations/001_medical_directory.sql", "utf8");

  it("enables RLS for every sensitive directory table", () => {
    for (const table of ["doctors", "doctor_conditions", "doctor_availability", "reviews", "favorites", "provider_verification_audit"]) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it("prevents publication before credential approval", () => {
    expect(migration).toContain("verified_publication_guard");
    expect(migration).toContain("verified_credentials_status = 'verified'");
  });

  it("uses an atomic server-side slot transition for booking", () => {
    expect(migration).toContain("function public.hold_doctor_slot");
    expect(migration).toContain("slot_status = 'available'");
    expect(migration).toContain("set slot_status = 'held'");
  });
});
