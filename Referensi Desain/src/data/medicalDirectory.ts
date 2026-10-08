export type SpecialtyCategory = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  specialties: string[];
  conditions: string[];
};

export type Condition = {
  slug: string;
  name: string;
  aliases: string[];
  category: string;
  overview: string;
  symptoms: string[];
  specialties: string[];
  routine: string;
  urgent: string;
};

export type Doctor = {
  id: string;
  name: string;
  title: string;
  primarySpecialty: string;
  additionalSpecialties: string[];
  qualifications: string[];
  registration: string;
  jurisdiction: string;
  verification: "Pending" | "Verified" | "Rejected";
  careerStart: number;
  biography: string;
  languages: string[];
  modes: ("Video" | "In-person")[];
  fee: number;
  clinic: string;
  city: string;
  address: string;
  ageGroups: string[];
  conditions: string[];
  services: string[];
  referrals: string[];
  facilities: string[];
  availability: string[];
  acceptedInsurance?: string[];
  photo: string;
};

export const specialtyCategories: SpecialtyCategory[] = [
  {
    id: "general-care",
    name: "General and primary care",
    shortName: "General Care",
    description: "First-contact care, prevention, routine concerns, and long-term health management.",
    specialties: ["General Physician", "Family Medicine Doctor", "Internal Medicine Specialist", "Preventive Medicine Specialist", "Geriatrician", "Infectious Disease Specialist"],
    conditions: ["Fever", "Common cold", "General infections", "Preventive screening", "Chronic disease management"],
  },
  {
    id: "heart-circulation",
    name: "Heart and blood circulation",
    shortName: "Heart and Circulation",
    description: "Care for the heart, blood vessels, circulation, and heart rhythm.",
    specialties: ["Cardiologist", "Interventional Cardiologist", "Cardiac Electrophysiologist", "Cardiothoracic Surgeon", "Vascular Surgeon"],
    conditions: ["Hypertension", "Coronary artery disease", "Heart rhythm disorders", "Heart failure", "Vascular conditions"],
  },
  {
    id: "brain-nerves",
    name: "Brain, nerves, and spine",
    shortName: "Brain and Nerves",
    description: "Evaluation of neurological, nerve, movement, and spine-related concerns.",
    specialties: ["Neurologist", "Neurosurgeon", "Spine Surgeon", "Pediatric Neurologist", "Neurophysician"],
    conditions: ["Migraine", "Epilepsy", "Stroke evaluation", "Neuropathy", "Movement disorders"],
  },
  {
    id: "bones-joints",
    name: "Bones, joints, and muscles",
    shortName: "Bones and Joints",
    description: "Musculoskeletal health, rehabilitation, injuries, mobility, and pain care.",
    specialties: ["Orthopedic Surgeon", "Sports Medicine Specialist", "Rheumatologist", "Physiotherapist", "Pain Management Specialist"],
    conditions: ["Arthritis", "Joint pain", "Sports injuries", "Fractures", "Back pain", "Mobility problems"],
  },
  {
    id: "skin-hair",
    name: "Skin, hair, and nails",
    shortName: "Skin and Hair",
    description: "Medical care for skin, scalp, hair, and nail conditions.",
    specialties: ["Dermatologist", "Pediatric Dermatologist", "Cosmetic Dermatologist"],
    conditions: ["Acne", "Eczema", "Psoriasis", "Dermatitis", "Hair and scalp disorders", "Skin infections"],
  },
  {
    id: "child-health",
    name: "Child healthcare",
    shortName: "Child Health",
    description: "Health, development, prevention, and specialist care for infants and children.",
    specialties: ["Pediatrician", "Neonatologist", "Pediatric Cardiologist", "Pediatric Surgeon", "Developmental Pediatrician"],
    conditions: ["Childhood infections", "Growth monitoring", "Newborn care", "Childhood allergies", "Developmental concerns"],
  },
  {
    id: "womens-health",
    name: "Women's healthcare",
    shortName: "Women's Health",
    description: "Reproductive, pregnancy, menstrual, fertility, and gynecologic care.",
    specialties: ["Gynecologist", "Obstetrician", "Fertility Specialist", "Reproductive Endocrinologist", "Gynecologic Oncologist", "Maternal-Fetal Medicine Specialist"],
    conditions: ["Pregnancy care", "Menstrual disorders", "Menopause", "Fertility concerns", "PCOS", "Endometriosis"],
  },
  {
    id: "mens-health",
    name: "Men's healthcare",
    shortName: "Men's Health",
    description: "Urinary, prostate, reproductive, and preventive healthcare for men.",
    specialties: ["Urologist", "Andrologist", "Men's Health Specialist"],
    conditions: ["Urinary concerns", "Prostate disorders", "Kidney stones", "Male reproductive health"],
  },
  {
    id: "digestive-health",
    name: "Digestive system and liver",
    shortName: "Digestive Health",
    description: "Care for digestive organs, bowel health, liver conditions, and related surgery.",
    specialties: ["Gastroenterologist", "Hepatologist", "Colorectal Surgeon", "General Surgeon"],
    conditions: ["Acid reflux", "Gastritis", "Irritable bowel syndrome", "Inflammatory bowel disease", "Liver disorders"],
  },
  {
    id: "kidney-health",
    name: "Kidney and urinary health",
    shortName: "Kidney Health",
    description: "Medical and surgical care for kidneys, urinary health, and renal transplantation.",
    specialties: ["Nephrologist", "Urologist", "Renal Transplant Specialist"],
    conditions: ["Chronic kidney disease", "Kidney function disorders", "Electrolyte problems", "Urinary conditions", "Kidney stones"],
  },
  {
    id: "respiratory-health",
    name: "Lungs and respiratory health",
    shortName: "Respiratory Health",
    description: "Breathing, allergy, airway, lung, and thoracic care.",
    specialties: ["Pulmonologist", "Respiratory Medicine Specialist", "Thoracic Surgeon", "Allergist and Immunologist"],
    conditions: ["Asthma", "COPD", "Respiratory allergies", "Sleep-related breathing disorders", "Lung diseases"],
  },
  {
    id: "hormones-diabetes",
    name: "Hormones, diabetes, and metabolism",
    shortName: "Diabetes and Hormones",
    description: "Hormonal health, diabetes, thyroid, bone metabolism, and endocrine conditions.",
    specialties: ["Endocrinologist", "Diabetologist", "Metabolic Medicine Specialist"],
    conditions: ["Diabetes", "Thyroid disorders", "PCOS", "Osteoporosis", "Hormonal disorders"],
  },
  {
    id: "cancer-care",
    name: "Blood disorders and cancer care",
    shortName: "Cancer Care",
    description: "Blood disorders, cancer evaluation, treatment planning, and multidisciplinary care.",
    specialties: ["Hematologist", "Medical Oncologist", "Surgical Oncologist", "Radiation Oncologist", "Hemato-Oncologist"],
    conditions: ["Anemia", "Clotting disorders", "Blood cancers", "Solid tumors", "Cancer treatment planning"],
  },
  {
    id: "eye-ear-care",
    name: "Ear, nose, throat, and vision",
    shortName: "Eye and Ear Care",
    description: "Hearing, sinus, throat, eye, retina, glaucoma, and vision care.",
    specialties: ["ENT Specialist", "Otologist", "Ophthalmologist", "Retina Specialist", "Glaucoma Specialist", "Pediatric Ophthalmologist"],
    conditions: ["Sinusitis", "Ear infections", "Hearing problems", "Cataracts", "Glaucoma", "Retinal conditions"],
  },
  {
    id: "dental-care",
    name: "Dental and oral health",
    shortName: "Dental Care",
    description: "Preventive, restorative, alignment, gum, root canal, and oral surgical care.",
    specialties: ["General Dentist", "Orthodontist", "Endodontist", "Periodontist", "Oral and Maxillofacial Surgeon", "Pediatric Dentist"],
    conditions: ["Tooth decay", "Gum disease", "Bite alignment", "Root canal needs", "Oral health concerns"],
  },
  {
    id: "mental-wellness",
    name: "Mental and behavioral health",
    shortName: "Mental Wellness",
    description: "Medical, psychological, counseling, addiction, and behavioral health support.",
    specialties: ["Psychiatrist", "Clinical Psychologist", "Licensed Counselor", "Child and Adolescent Psychiatrist", "Addiction Medicine Specialist"],
    conditions: ["Anxiety", "Depression", "Sleep difficulties", "Stress", "Behavioral concerns", "Substance-use disorders"],
  },
  {
    id: "allergy-immunity",
    name: "Allergy, immunity, and infections",
    shortName: "Allergy and Immunity",
    description: "Complex allergy, immune-system, recurrent infection, and infectious disease care.",
    specialties: ["Allergist and Immunologist", "Infectious Disease Specialist", "Clinical Immunologist"],
    conditions: ["Allergic conditions", "Immune disorders", "Recurrent infections", "Complex infectious diseases"],
  },
  {
    id: "preventive-screening",
    name: "Cancer screening and preventive care",
    shortName: "Preventive Care",
    description: "Risk assessment, screening consultation, suspicious symptom evaluation, and referrals.",
    specialties: ["Breast Specialist", "Breast Surgical Oncologist", "Colorectal Screening Specialist", "Preventive Health Specialist"],
    conditions: ["Breast symptom evaluation", "Cancer risk assessment", "Colorectal screening", "Preventive screening"],
  },
  {
    id: "rehabilitation",
    name: "Rehabilitation and supportive care",
    shortName: "Rehabilitation",
    description: "Recovery, mobility, communication, symptom support, pain, and nutrition services.",
    specialties: ["Physical Medicine and Rehabilitation Specialist", "Occupational Therapist", "Speech and Language Therapist", "Palliative Care Specialist", "Pain Medicine Specialist", "Registered Dietitian"],
    conditions: ["Injury recovery", "Mobility limitations", "Swallowing difficulties", "Complex symptoms", "Nutrition needs"],
  },
  {
    id: "other-specialties",
    name: "Diagnostic and additional specialties",
    shortName: "Other Specialties",
    description: "Diagnostic, perioperative, emergency, workplace, travel, sleep, sport, and genetic services.",
    specialties: ["Radiologist", "Nuclear Medicine Specialist", "Pathologist", "Anesthesiologist", "Sleep Medicine Specialist", "Occupational Health Physician", "Emergency Medicine Specialist", "Travel Medicine Specialist", "Sports Medicine Physician", "Clinical Geneticist"],
    conditions: ["Diagnostic imaging", "Pathology services", "Sleep disorders", "Travel health", "Genetic evaluation"],
  },
];

export const conditions: Condition[] = [
  { slug: "hypertension", name: "Hypertension", aliases: ["High blood pressure"], category: "Heart and circulation", overview: "Hypertension means blood pressure remains higher than the recommended range over time. Measurement over multiple occasions is usually needed.", symptoms: ["Often no noticeable symptoms", "Occasional headache", "Dizziness in some people"], specialties: ["Cardiologist", "General Physician", "Internal Medicine Specialist"], routine: "Arrange a routine consultation for repeated elevated readings or medication review.", urgent: "Seek urgent care for very high readings with chest pain, severe headache, confusion, weakness, or breathing difficulty." },
  { slug: "diabetes", name: "Diabetes", aliases: ["High blood sugar", "Diabetes mellitus"], category: "Hormones and metabolism", overview: "Diabetes affects how the body regulates blood glucose. Diagnosis requires appropriate clinical assessment and testing.", symptoms: ["Increased thirst", "Frequent urination", "Unexplained weight change", "Fatigue"], specialties: ["Endocrinologist", "Diabetologist", "General Physician"], routine: "Book a consultation for persistent symptoms, abnormal screening results, or ongoing diabetes management.", urgent: "Urgent assessment is needed for confusion, vomiting, deep breathing, severe dehydration, or loss of consciousness." },
  { slug: "thyroid-disorders", name: "Thyroid disorders", aliases: ["Underactive thyroid", "Overactive thyroid"], category: "Hormones and metabolism", overview: "Thyroid disorders may change hormone production and affect energy, weight, temperature tolerance, and heart rate.", symptoms: ["Fatigue", "Weight change", "Temperature sensitivity", "Heart-rate changes"], specialties: ["Endocrinologist", "Internal Medicine Specialist"], routine: "Arrange a consultation for persistent symptoms or an abnormal thyroid test.", urgent: "Seek urgent help for severe confusion, collapse, extreme agitation, or major heart-rate changes." },
  { slug: "asthma", name: "Asthma", aliases: ["Reactive airway disease"], category: "Respiratory health", overview: "Asthma is a long-term airway condition that can cause variable breathing symptoms. Similar symptoms may have other causes.", symptoms: ["Wheezing", "Cough", "Chest tightness", "Shortness of breath"], specialties: ["Pulmonologist", "Respiratory Medicine Specialist", "Allergist and Immunologist"], routine: "Book a consultation for recurrent cough, wheeze, nighttime symptoms, or inhaler review.", urgent: "Call emergency services for severe breathlessness, blue lips, confusion, or inability to speak full sentences." },
  { slug: "migraine", name: "Migraine", aliases: ["Migraine headache"], category: "Brain and nerves", overview: "Migraine is a neurological condition often involving episodes of headache and sensitivity symptoms. Not every severe headache is migraine.", symptoms: ["Throbbing headache", "Light or sound sensitivity", "Nausea", "Visual disturbance"], specialties: ["Neurologist", "Neurophysician", "General Physician"], routine: "Arrange care for recurring headaches, changing patterns, or symptoms affecting daily life.", urgent: "Seek urgent care for a sudden worst-ever headache, weakness, confusion, seizure, fever with neck stiffness, or headache after injury." },
  { slug: "arthritis", name: "Arthritis", aliases: ["Joint inflammation"], category: "Bones and joints", overview: "Arthritis describes several conditions involving joint pain, stiffness, or inflammation. The correct specialty depends on the cause.", symptoms: ["Joint pain", "Stiffness", "Swelling", "Reduced movement"], specialties: ["Rheumatologist", "Orthopedic Surgeon", "Physiotherapist"], routine: "Book a consultation for ongoing joint pain, morning stiffness, swelling, or reduced mobility.", urgent: "Urgent evaluation is needed for a hot swollen joint with fever, major trauma, or inability to bear weight." },
  { slug: "eczema", name: "Eczema", aliases: ["Atopic dermatitis"], category: "Skin and hair", overview: "Eczema is a group of inflammatory skin conditions that can cause dry, itchy, irritated skin.", symptoms: ["Dry skin", "Itching", "Red or darker patches", "Cracking or oozing"], specialties: ["Dermatologist", "Pediatric Dermatologist"], routine: "Arrange care for persistent, infected, widespread, or sleep-disrupting symptoms.", urgent: "Urgent review may be needed for rapidly spreading redness, fever, facial swelling, or breathing difficulty." },
  { slug: "acne", name: "Acne", aliases: ["Acne vulgaris"], category: "Skin and hair", overview: "Acne affects hair follicles and oil glands. Severity and treatment needs vary.", symptoms: ["Blackheads", "Whiteheads", "Inflamed spots", "Cysts or scarring"], specialties: ["Dermatologist", "Pediatric Dermatologist"], routine: "Book care for painful, persistent, scarring, or emotionally distressing acne.", urgent: "Acne is rarely an emergency; seek urgent help for a severe allergic reaction to a product or medicine." },
  { slug: "acid-reflux", name: "Acid reflux", aliases: ["GERD", "Heartburn"], category: "Digestive health", overview: "Acid reflux occurs when stomach contents move upward into the food pipe. Chest discomfort can also have cardiac causes.", symptoms: ["Burning behind the breastbone", "Sour taste", "Regurgitation", "Night cough"], specialties: ["Gastroenterologist", "General Physician"], routine: "Arrange care for frequent symptoms, swallowing difficulty, ongoing cough, or symptoms despite self-care.", urgent: "Treat new severe chest pain, sweating, breathlessness, vomiting blood, or black stools as urgent." },
  { slug: "chronic-kidney-disease", name: "Chronic kidney disease", aliases: ["CKD", "Chronic renal disease"], category: "Kidney health", overview: "Chronic kidney disease means kidney function or structure has been abnormal for an extended period.", symptoms: ["May have no early symptoms", "Swelling", "Fatigue", "Urination changes"], specialties: ["Nephrologist", "Internal Medicine Specialist"], routine: "Arrange care for abnormal kidney tests, diabetes-related monitoring, swelling, or blood pressure review.", urgent: "Seek urgent assessment for severe breathlessness, confusion, very low urine output, or rapidly increasing swelling." },
  { slug: "anemia", name: "Anemia", aliases: ["Low hemoglobin"], category: "Blood disorders", overview: "Anemia means there are too few healthy red blood cells or too little hemoglobin. It has many possible causes.", symptoms: ["Fatigue", "Pale skin", "Shortness of breath", "Dizziness"], specialties: ["Hematologist", "General Physician", "Internal Medicine Specialist"], routine: "Book a consultation for persistent fatigue or an abnormal blood count.", urgent: "Urgent evaluation is needed for fainting, chest pain, severe breathlessness, active bleeding, or very rapid heartbeat." },
  { slug: "allergies", name: "Allergies", aliases: ["Allergic disease"], category: "Allergy and immunity", overview: "Allergies are immune reactions to substances that are usually harmless to many people.", symptoms: ["Sneezing", "Itching", "Rash", "Swelling"], specialties: ["Allergist and Immunologist", "Clinical Immunologist", "Dermatologist"], routine: "Arrange care for recurring symptoms, uncertain triggers, or treatment planning.", urgent: "Call emergency services for breathing difficulty, throat swelling, collapse, or a rapidly progressing reaction." },
  { slug: "pcos", name: "Polycystic ovary syndrome", aliases: ["PCOS"], category: "Women's health", overview: "PCOS is a hormonal condition associated with ovulation changes and other metabolic or skin symptoms.", symptoms: ["Irregular periods", "Acne", "Excess hair growth", "Fertility concerns"], specialties: ["Gynecologist", "Endocrinologist", "Reproductive Endocrinologist"], routine: "Arrange a consultation for irregular cycles, fertility concerns, or symptoms affecting wellbeing.", urgent: "Severe sudden pelvic pain, heavy bleeding, fainting, or pregnancy-related pain needs urgent assessment." },
  { slug: "endometriosis", name: "Endometriosis", aliases: [], category: "Women's health", overview: "Endometriosis is a condition where tissue similar to the uterine lining grows elsewhere, often causing pain.", symptoms: ["Painful periods", "Pelvic pain", "Pain during sex", "Fertility concerns"], specialties: ["Gynecologist", "Fertility Specialist"], routine: "Arrange care for persistent pelvic pain, painful periods, or fertility concerns.", urgent: "Sudden severe pelvic pain, fainting, heavy bleeding, or pain during pregnancy needs urgent evaluation." },
  { slug: "cataracts", name: "Cataracts", aliases: ["Cloudy lens"], category: "Eye care", overview: "A cataract is clouding of the eye's natural lens, usually causing gradual vision change.", symptoms: ["Blurred vision", "Glare", "Faded colors", "Poor night vision"], specialties: ["Ophthalmologist"], routine: "Book an eye assessment for gradual vision changes or difficulty with daily activities.", urgent: "Sudden vision loss, severe eye pain, flashes with a curtain-like shadow, or eye injury needs urgent care." },
  { slug: "sinusitis", name: "Sinusitis", aliases: ["Sinus infection"], category: "Ear, nose, and throat", overview: "Sinusitis is inflammation of the sinus lining and may be related to infection, allergy, or other causes.", symptoms: ["Facial pressure", "Blocked nose", "Nasal discharge", "Reduced smell"], specialties: ["ENT Specialist", "General Physician", "Allergist and Immunologist"], routine: "Arrange care for prolonged, recurrent, or severe symptoms.", urgent: "Urgent assessment is needed for swelling around an eye, vision changes, severe headache, confusion, or neck stiffness." },
  { slug: "depression", name: "Depression", aliases: ["Major depressive disorder"], category: "Mental wellness", overview: "Depression can affect mood, thoughts, energy, sleep, and daily functioning. A qualified professional can assess symptoms and support options.", symptoms: ["Persistent low mood", "Loss of interest", "Sleep changes", "Hopelessness"], specialties: ["Psychiatrist", "Clinical Psychologist", "Licensed Counselor"], routine: "Arrange support when symptoms persist, affect functioning, or cause concern.", urgent: "If you may harm yourself or someone else, contact local emergency services or a crisis service now." },
  { slug: "anxiety", name: "Anxiety disorders", aliases: ["Anxiety"], category: "Mental wellness", overview: "Anxiety disorders involve excessive fear or worry that can affect daily life. Physical symptoms should still be assessed appropriately.", symptoms: ["Excessive worry", "Restlessness", "Panic symptoms", "Sleep difficulty"], specialties: ["Psychiatrist", "Clinical Psychologist", "Licensed Counselor"], routine: "Arrange support when anxiety is persistent, distressing, or limiting activities.", urgent: "Seek urgent help for risk of self-harm, severe confusion, collapse, or symptoms that could be a medical emergency." },
  { slug: "epilepsy", name: "Epilepsy", aliases: ["Seizure disorder"], category: "Brain and nerves", overview: "Epilepsy is a neurological disorder involving a tendency to have unprovoked seizures. A single event can have other causes.", symptoms: ["Seizures", "Brief loss of awareness", "Unusual movements", "Post-event confusion"], specialties: ["Neurologist", "Pediatric Neurologist"], routine: "Arrange specialist care after a suspected seizure or for ongoing seizure management.", urgent: "Call emergency services for a first seizure, a seizure lasting over five minutes, repeated seizures, injury, pregnancy, or breathing problems." },
  { slug: "copd", name: "COPD", aliases: ["Chronic obstructive pulmonary disease"], category: "Respiratory health", overview: "COPD is a group of long-term lung conditions that limit airflow and require clinical diagnosis.", symptoms: ["Breathlessness", "Chronic cough", "Sputum", "Wheezing"], specialties: ["Pulmonologist", "Respiratory Medicine Specialist"], routine: "Arrange care for ongoing cough or breathlessness, or to review an existing care plan.", urgent: "Severe breathing difficulty, blue lips, chest pain, confusion, or drowsiness requires emergency help." },
  { slug: "kidney-stones", name: "Kidney stones", aliases: ["Renal stones"], category: "Kidney and urinary health", overview: "Kidney stones are mineral deposits that can cause pain or urinary symptoms when moving through the urinary tract.", symptoms: ["Severe side pain", "Blood in urine", "Nausea", "Urinary urgency"], specialties: ["Urologist", "Nephrologist"], routine: "Arrange care for recurrent stones, ongoing discomfort, or prevention planning.", urgent: "Urgent assessment is needed for fever with pain, inability to pass urine, uncontrolled pain, persistent vomiting, or pregnancy." },
  { slug: "glaucoma", name: "Glaucoma", aliases: [], category: "Eye care", overview: "Glaucoma describes optic-nerve damage often associated with eye pressure. Screening is important because early disease may have no symptoms.", symptoms: ["Often no early symptoms", "Gradual peripheral vision loss", "Eye pain in acute forms"], specialties: ["Glaucoma Specialist", "Ophthalmologist"], routine: "Book an eye assessment if at risk, overdue for screening, or noticing gradual vision change.", urgent: "Severe eye pain, headache, nausea, halos, or sudden blurred vision needs emergency eye assessment." },
  { slug: "ibs", name: "Irritable bowel syndrome", aliases: ["IBS"], category: "Digestive health", overview: "IBS is a disorder of gut-brain interaction involving abdominal pain and bowel habit changes after other concerning causes are considered.", symptoms: ["Abdominal pain", "Bloating", "Constipation", "Diarrhea"], specialties: ["Gastroenterologist", "General Physician", "Registered Dietitian"], routine: "Arrange care for persistent symptoms or a change in bowel habits.", urgent: "Seek urgent care for severe pain, vomiting blood, black stools, major bleeding, fainting, or a rigid abdomen." },
  { slug: "sleep-apnea", name: "Sleep apnea", aliases: ["Obstructive sleep apnea"], category: "Sleep and respiratory health", overview: "Sleep apnea causes repeated breathing interruptions during sleep and requires clinical assessment and testing.", symptoms: ["Loud snoring", "Witnessed pauses", "Daytime sleepiness", "Morning headache"], specialties: ["Sleep Medicine Specialist", "Pulmonologist", "ENT Specialist"], routine: "Arrange assessment for witnessed pauses, loud snoring with sleepiness, or resistant hypertension.", urgent: "Emergency care is needed for severe breathing difficulty while awake, chest pain, confusion, or collapse." },
];

const photos = [
  "https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=700&q=85",
];

export const doctors: Doctor[] = [
  { id: "anaya-rao", name: "Dr. Anaya Rao", title: "Fictional clinician profile", primarySpecialty: "Endocrinologist", additionalSpecialties: ["Internal Medicine Specialist"], qualifications: ["Demo MBBS", "Demo MD — Endocrinology"], registration: "Not published — demo record", jurisdiction: "Demo jurisdiction", verification: "Pending", careerStart: 2011, biography: "A fictional profile created to demonstrate diabetes, thyroid, and metabolic-health discovery workflows.", languages: ["English", "Hindi", "Kannada"], modes: ["Video", "In-person"], fee: 1100, clinic: "Northstar Medical Centre", city: "New Delhi", address: "Demo address, New Delhi", ageGroups: ["Adults", "Older adults"], conditions: ["diabetes", "thyroid-disorders", "pcos"], services: ["Diabetes management consultation", "Thyroid evaluation", "Metabolic health review"], referrals: ["Diabetes-related eye disease", "Complex pregnancy care"], facilities: ["Affiliated pathology service", "Demo endocrine testing referral"], availability: ["Today 4:30 PM", "Tomorrow 9:00 AM", "Tomorrow 11:30 AM"], photo: photos[0] },
  { id: "vivaan-mehta", name: "Dr. Vivaan Mehta", title: "Fictional clinician profile", primarySpecialty: "Cardiologist", additionalSpecialties: ["Internal Medicine Specialist"], qualifications: ["Demo MBBS", "Demo DM — Cardiology"], registration: "Not published — demo record", jurisdiction: "Demo jurisdiction", verification: "Pending", careerStart: 2008, biography: "A fictional cardiology profile for demonstrating heart-health search and booking interfaces.", languages: ["English", "Hindi"], modes: ["Video", "In-person"], fee: 1400, clinic: "Blue Oak Heart Centre", city: "New Delhi", address: "Demo address, New Delhi", ageGroups: ["Adults", "Older adults"], conditions: ["hypertension"], services: ["Blood pressure evaluation", "Cardiovascular risk consultation", "ECG review"], referrals: ["Interventional procedures", "Cardiac surgery"], facilities: ["ECG", "Echocardiography referral"], availability: ["Tomorrow 10:00 AM", "Friday 3:30 PM"], photo: photos[1] },
  { id: "meera-kapoor", name: "Dr. Meera Kapoor", title: "Fictional clinician profile", primarySpecialty: "Neurologist", additionalSpecialties: ["Neurophysician"], qualifications: ["Demo MBBS", "Demo DM — Neurology"], registration: "Not published — demo record", jurisdiction: "Demo jurisdiction", verification: "Pending", careerStart: 2013, biography: "A fictional neurology profile used for migraine, epilepsy, and nerve-health discovery.", languages: ["English", "Hindi", "Punjabi"], modes: ["Video", "In-person"], fee: 1250, clinic: "Cedar Neurosciences Clinic", city: "Gurugram", address: "Demo address, Gurugram", ageGroups: ["Adults"], conditions: ["migraine", "epilepsy"], services: ["Headache evaluation", "Seizure consultation", "Neurological examination"], referrals: ["Neurosurgery", "Emergency stroke service"], facilities: ["EEG referral", "MRI referral"], availability: ["Today 6:00 PM", "Thursday 12:00 PM"], photo: photos[2] },
  { id: "arjun-sen", name: "Dr. Arjun Sen", title: "Fictional clinician profile", primarySpecialty: "Pulmonologist", additionalSpecialties: ["Sleep Medicine Specialist"], qualifications: ["Demo MBBS", "Demo MD — Respiratory Medicine"], registration: "Not published — demo record", jurisdiction: "Demo jurisdiction", verification: "Pending", careerStart: 2010, biography: "A fictional respiratory profile demonstrating asthma, COPD, and sleep-care discovery.", languages: ["English", "Hindi", "Bengali"], modes: ["Video", "In-person"], fee: 1000, clinic: "Aster Breathing & Sleep Clinic", city: "New Delhi", address: "Demo address, New Delhi", ageGroups: ["Adults", "Older adults"], conditions: ["asthma", "copd", "sleep-apnea"], services: ["Asthma review", "Lung function consultation", "Sleep breathing evaluation"], referrals: ["Thoracic surgery", "Emergency respiratory care"], facilities: ["Spirometry", "Sleep study referral"], availability: ["Tomorrow 8:30 AM", "Friday 1:00 PM"], photo: photos[3] },
  { id: "kiara-shah", name: "Dr. Kiara Shah", title: "Fictional clinician profile", primarySpecialty: "Dermatologist", additionalSpecialties: ["Pediatric Dermatologist"], qualifications: ["Demo MBBS", "Demo MD — Dermatology"], registration: "Not published — demo record", jurisdiction: "Demo jurisdiction", verification: "Pending", careerStart: 2015, biography: "A fictional medical dermatology profile for demonstrating skin and hair discovery.", languages: ["English", "Hindi", "Gujarati"], modes: ["Video", "In-person"], fee: 900, clinic: "Lumen Skin Clinic", city: "Noida", address: "Demo address, Noida", ageGroups: ["Children", "Adults"], conditions: ["eczema", "acne", "allergies"], services: ["Medical acne evaluation", "Eczema care planning", "Skin infection assessment"], referrals: ["Skin surgery", "Allergy testing"], facilities: ["Dermatoscopy", "Pathology referral"], availability: ["Today 5:15 PM", "Saturday 10:30 AM"], photo: photos[0] },
  { id: "isha-nair", name: "Dr. Isha Nair", title: "Fictional clinician profile", primarySpecialty: "Gynecologist", additionalSpecialties: ["Obstetrician"], qualifications: ["Demo MBBS", "Demo MS — Obstetrics & Gynecology"], registration: "Not published — demo record", jurisdiction: "Demo jurisdiction", verification: "Pending", careerStart: 2009, biography: "A fictional women's-health profile demonstrating reproductive and pregnancy-care discovery.", languages: ["English", "Hindi", "Malayalam"], modes: ["Video", "In-person"], fee: 1200, clinic: "Bloom Women's Health Centre", city: "New Delhi", address: "Demo address, New Delhi", ageGroups: ["Adults"], conditions: ["pcos", "endometriosis"], services: ["Menstrual health consultation", "Pregnancy care consultation", "PCOS evaluation"], referrals: ["Maternal-fetal medicine", "Gynecologic oncology"], facilities: ["Ultrasound referral", "Affiliated maternity services"], availability: ["Thursday 9:30 AM", "Saturday 11:00 AM"], photo: photos[2] },
  { id: "rohan-gupta", name: "Dr. Rohan Gupta", title: "Fictional clinician profile", primarySpecialty: "General Physician", additionalSpecialties: ["Family Medicine Doctor"], qualifications: ["Demo MBBS", "Demo DNB — Family Medicine"], registration: "Not published — demo record", jurisdiction: "Demo jurisdiction", verification: "Pending", careerStart: 2016, biography: "A fictional primary-care profile demonstrating first-contact assessment, prevention, and coordinated referrals.", languages: ["English", "Hindi"], modes: ["Video", "In-person"], fee: 700, clinic: "Harbor Family Practice", city: "Gurugram", address: "Demo address, Gurugram", ageGroups: ["Children", "Adults", "Older adults"], conditions: ["hypertension", "diabetes", "anemia", "acid-reflux", "sinusitis"], services: ["General health consultation", "Preventive screening review", "Chronic disease follow-up"], referrals: ["Specialist consultation when indicated", "Emergency assessment"], facilities: ["Basic health screening", "Affiliated laboratory"], availability: ["Today 2:00 PM", "Today 7:00 PM", "Tomorrow 10:30 AM"], photo: photos[1] },
  { id: "tara-bose", name: "Dr. Tara Bose", title: "Fictional clinician profile", primarySpecialty: "Psychiatrist", additionalSpecialties: ["Addiction Medicine Specialist"], qualifications: ["Demo MBBS", "Demo MD — Psychiatry"], registration: "Not published — demo record", jurisdiction: "Demo jurisdiction", verification: "Pending", careerStart: 2012, biography: "A fictional medical mental-health profile. Psychiatrists are physicians who can assess medical contributors and prescribe where licensed; psychologists and counselors have different training and scopes.", languages: ["English", "Hindi", "Bengali"], modes: ["Video", "In-person"], fee: 1500, clinic: "Stillwater Mental Health Clinic", city: "New Delhi", address: "Demo address, New Delhi", ageGroups: ["Adults"], conditions: ["depression", "anxiety"], services: ["Psychiatric assessment", "Medication review where appropriate", "Addiction medicine consultation"], referrals: ["Clinical psychology", "Licensed counseling", "Emergency crisis service"], facilities: ["Therapy referral network"], availability: ["Tomorrow 4:00 PM", "Friday 5:30 PM"], photo: photos[0] },
];

export const allSpecialties = specialtyCategories.flatMap((category) =>
  category.specialties.map((name) => ({ name, categoryId: category.id, categoryName: category.shortName })),
);

export function getSpecialty(nameOrSlug: string) {
  const normalized = nameOrSlug.toLowerCase().replace(/-/g, " ");
  return allSpecialties.find((specialty) => specialty.name.toLowerCase() === normalized);
}

export function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const urgentTerms = ["chest pain", "cannot breathe", "difficulty breathing", "severe bleeding", "unconscious", "stroke", "suicidal", "self harm", "seizure"];
