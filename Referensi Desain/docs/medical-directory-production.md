# Medical directory production setup

The current directory uses fictional in-memory records. No clinician, credential, review, availability, insurance acceptance, map location, or rating is claimed to be real.

## Required configuration

1. Connect a Supabase project and review `supabase/migrations/001_medical_directory.sql`.
2. Link the existing appointments table from `reviews.appointment_id` with a foreign key.
3. Replace the demo arrays in `src/data/medicalDirectory.ts` with paginated Supabase queries.
4. Keep public doctor queries restricted to `publication_status = published` and `verified_credentials_status = verified`.
5. Build a server-side evidence workflow for registration-authority checks. Registration identifiers should be encrypted, and only a safe public representation should be exposed.
6. Require administrator authentication, least-privilege roles, immutable verification audit records, and a suspension workflow.
7. Count ratings only from approved reviews tied to eligible completed appointments. Never seed reviews or ratings.
8. Configure a map provider before calculating distance, routes, or directions. Do not infer or fabricate clinician locations.
9. Store qualification evidence in a private bucket with short-lived signed URLs and reviewer-only policies.
10. Connect a booking service to the `hold_doctor_slot` transaction and release expired holds from trusted server code.
11. Validate insurance participation directly with the provider before displaying or filtering it.
12. Add server pagination, full-text search, rate limiting, abuse monitoring, and backup/retention policies.

Figma Make is not intended for collecting real patient PII or securing production healthcare data. Complete a privacy, security, legal, clinical-safety, and accessibility review before production use.
