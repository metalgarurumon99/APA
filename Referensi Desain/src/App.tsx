import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity,
  AlarmClock,
  ArrowLeft,
  ArrowRight,
  Bell,
  Brain,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Clock3,
  CreditCard,
  Cross,
  Download,
  Eye,
  EyeOff,
  FileHeart,
  FileText,
  FlaskConical,
  Heart,
  HeartHandshake,
  Home,
  Hospital,
  Languages,
  LockKeyhole,
  MapPin,
  Menu,
  MessageCircle,
  Mic,
  MicOff,
  MoonStar,
  MoreHorizontal,
  Navigation,
  PhoneOff,
  Pill,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  Upload,
  UserRound,
  UsersRound,
  Video,
  VideoOff,
  WalletCards,
  Wind,
  X,
  Zap,
} from "lucide-react";
import {
  Link,
  NavLink,
  Outlet,
  RouterProvider,
  createBrowserRouter,
  useLocation,
  useNavigate,
  useParams,
} from "react-router";
import { allSpecialties, conditions, doctors, getSpecialty, slugify, specialtyCategories, urgentTerms } from "./data/medicalDirectory";
import { defaultDoctorFilters, discoveryReasons, searchDoctors, suggestedSpecialties, yearsOfExperience } from "./lib/doctorSearch";

const doctorPhoto =
  "https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=800&q=85";

const routes = [
  ["/", "Home", Home],
  ["/doctors", "Doctors", Stethoscope],
  ["/appointments", "Appointments", CalendarDays],
  ["/records", "Records", FileHeart],
  ["/settings", "Profile", CircleUserRound],
] as const;

const actions = [
  { label: "Find a Doctor", note: "Trusted specialists", icon: Stethoscope, path: "/doctors", tone: "blue" },
  { label: "Book Appointment", note: "In-person or video", icon: CalendarDays, path: "/booking", tone: "purple" },
  { label: "AI Symptom Checker", note: "Understand next steps", icon: Brain, path: "/symptoms", tone: "cyan" },
  { label: "Lab Tests", note: "At home or a lab", icon: FlaskConical, path: "/labs", tone: "orange" },
  { label: "Health Records", note: "All records in one place", icon: FileHeart, path: "/records", tone: "green" },
  { label: "Mental Health", note: "Care for your mind", icon: HeartHandshake, path: "/mental-health", tone: "pink" },
];

function AppShell() {
  const [toast, setToast] = useState("");
  const location = useLocation();
  const noNav = location.pathname === "/auth";

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  return (
    <div className="app-shell">
      {!noNav && <Sidebar />}
      <main className={noNav ? "auth-main" : "main-content"}>
        <Outlet context={{ notify }} />
      </main>
      {!noNav && <BottomNav />}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          {toast}
        </div>
      )}
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <Brand />
      <nav className="side-nav" aria-label="Main navigation">
        {routes.map(([path, label, Icon]) => (
          <NavLink key={path} to={path} end={path === "/"} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <Icon size={19} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="side-card">
        <div className="side-card-icon"><Heart size={18} /></div>
        <strong>Need urgent help?</strong>
        <p>Call your local emergency services for immediate assistance.</p>
        <button onClick={() => window.alert("In an emergency, call your local emergency number now.")}>Emergency guidance</button>
      </div>
      <div className="demo-chip"><Sparkles size={14} /> Interactive demo</div>
    </aside>
  );
}

function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {routes.map(([path, label, Icon]) => (
        <NavLink key={path} to={path} end={path === "/"} className={({ isActive }) => (isActive ? "active" : "")}>
          <Icon size={20} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className={`brand ${light ? "light" : ""}`} aria-label="MediConnect home">
      <span className="brand-mark"><Cross size={22} strokeWidth={3} /></span>
      <span><b>Medi</b>Connect</span>
    </Link>
  );
}

function Page({
  title,
  eyebrow,
  children,
  action,
  back = false,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  action?: ReactNode;
  back?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <div className="page">
      <header className="page-header">
        <div className="title-row">
          {back && <button className="icon-button back" onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft size={21} /></button>}
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h1>{title}</h1>
          </div>
        </div>
        {action}
      </header>
      {children}
    </div>
  );
}

function Card({ children, className = "", onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return <div className={`card ${className} ${onClick ? "clickable" : ""}`} onClick={onClick}>{children}</div>;
}

function PrimaryButton({ children, onClick, type = "button", disabled = false, className = "" }: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  return <button type={type} className={`primary-button ${className}`} onClick={onClick} disabled={disabled}>{children}</button>;
}

function HomePage() {
  const navigate = useNavigate();
  return (
    <Page
      title="Good morning, Rohan"
      eyebrow="Wednesday, 24 September"
      action={<button className="notification-button" aria-label="Notifications" onClick={() => navigate("/settings")}><Bell size={20} /><i /></button>}
    >
      <section className="hero">
        <div className="hero-copy">
          <span className="live-pill"><ShieldCheck size={15} /> Your health, connected</span>
          <h2>Care that fits<br />your life.</h2>
          <p>Book trusted doctors, stay on top of medications, and keep every health record close.</p>
          <div className="hero-actions">
            <PrimaryButton onClick={() => navigate("/doctors")}>Find a doctor <ArrowRight size={18} /></PrimaryButton>
            <button className="secondary-button" onClick={() => navigate("/appointments")}>My appointments</button>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="pulse-ring"><Heart size={42} fill="currentColor" /></div>
          <span className="metric metric-one"><Activity size={16} /><b>72</b> bpm</span>
          <span className="metric metric-two"><CheckCircle2 size={16} /> All clear</span>
        </div>
      </section>

      <div className="section-heading">
        <div><p className="eyebrow">Health services</p><h2>How can we help?</h2></div>
      </div>
      <section className="action-grid">
        {actions.map(({ label, note, icon: Icon, path, tone }) => (
          <button key={label} className="action-card" onClick={() => navigate(path)}>
            <span className={`action-icon ${tone}`}><Icon size={24} /></span>
            <span><b>{label}</b><small>{note}</small></span>
            <ChevronRight size={18} />
          </button>
        ))}
      </section>

      <section className="dashboard-grid">
        <div>
          <div className="section-heading compact"><h2>Next appointment</h2><Link to="/appointments">View all</Link></div>
          <Card className="appointment-card">
            <div className="doctor-avatar"><img src={doctorPhoto} alt="Sample profile of Dr. Priya Sharma" /></div>
            <div className="grow">
              <span className="demo-label">Sample appointment</span>
              <h3>Dr. Priya Sharma</h3>
              <p>General Physician</p>
              <div className="inline-meta"><CalendarDays size={15} /> Today, 10:30 AM <span>•</span> Video</div>
            </div>
            <button className="icon-button" onClick={() => navigate("/video")} aria-label="Join video consultation"><Video size={20} /></button>
          </Card>
        </div>
        <div>
          <div className="section-heading compact"><h2>Today’s wellness</h2><Link to="/reminders">Manage</Link></div>
          <Card className="wellness-card">
            <div className="progress-ring"><span>2/3</span></div>
            <div><h3>You're nearly there</h3><p>One medication reminder left today.</p></div>
            <button className="text-button" onClick={() => navigate("/reminders")}>View reminders</button>
          </Card>
        </div>
      </section>
      <div className="section-heading compact"><h2>More care tools</h2></div>
      <section className="care-tools">
        <button onClick={() => navigate("/prescription")}><span><FileText size={19} /></span><div><b>Prescriptions</b><small>View saved clinical documents</small></div><ChevronRight size={17} /></button>
        <button onClick={() => navigate("/reminders")}><span><AlarmClock size={19} /></span><div><b>Medication reminders</b><small>Stay on top of your schedule</small></div><ChevronRight size={17} /></button>
        <button onClick={() => navigate("/payments")}><span><CreditCard size={19} /></span><div><b>Payments & insurance</b><small>Receipts and coverage</small></div><ChevronRight size={17} /></button>
      </section>
    </Page>
  );
}

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (!String(data.get("email")).includes("@") || String(data.get("password")).length < 6) {
      setError("Enter a valid email and a password with at least 6 characters.");
      return;
    }
    navigate("/");
  };
  return (
    <div className="auth-layout">
      <section className="auth-feature">
        <Brand light />
        <div>
          <span className="live-pill pale">Private by design</span>
          <h1>Better care begins with connection.</h1>
          <p>Keep appointments, prescriptions, lab reports, and family health in one secure place.</p>
        </div>
        <div className="trust-row"><ShieldCheck size={20} /> Demo mode — no medical data is stored</div>
      </section>
      <section className="auth-form-wrap">
        <div className="auth-form">
          <p className="eyebrow">Welcome to MediConnect</p>
          <h2>{mode === "login" ? "Sign in to your account" : "Create your account"}</h2>
          <p>{mode === "login" ? "Access your care dashboard and upcoming appointments." : "Start managing your health in one place."}</p>
          <div className="segmented">
            <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Sign in</button>
            <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Create account</button>
          </div>
          <form onSubmit={submit}>
            {mode === "signup" && (
              <label>Full name<span className="input-wrap"><UserRound size={18} /><input name="name" placeholder="Your full name" required /></span></label>
            )}
            <label>Email address<span className="input-wrap"><MessageCircle size={18} /><input type="email" name="email" placeholder="you@example.com" required /></span></label>
            {mode === "signup" && (
              <label>Phone number<span className="input-wrap"><PhoneOff size={18} /><input type="tel" name="phone" placeholder="+91 98765 43210" required /></span></label>
            )}
            <label>Password
              <span className="input-wrap"><LockKeyhole size={18} /><input type={showPassword ? "text" : "password"} name="password" placeholder="At least 6 characters" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </span>
            </label>
            {error && <p className="form-error">{error}</p>}
            <PrimaryButton type="submit">{mode === "login" ? "Sign in" : "Create account"} <ArrowRight size={18} /></PrimaryButton>
          </form>
          <div className="divider"><span>or continue with</span></div>
          <div className="social-row">
            <button onClick={() => setError("Social sign-in is not connected in demo mode.")}>G Google</button>
            <button onClick={() => setError("Apple sign-in is not connected in demo mode.")}>● Apple</button>
          </div>
          <button className="forgot" onClick={() => setError("Password recovery instructions would be sent after backend connection.")}>Forgot password?</button>
        </div>
      </section>
    </div>
  );
}

function SymptomChecker() {
  const [step, setStep] = useState(0);
  const [symptoms, setSymptoms] = useState("");
  const [severity, setSeverity] = useState(2);
  return (
    <Page title="AI symptom checker" eyebrow="Guided health assessment" back>
      <div className="content-narrow">
        <div className="safety-banner"><ShieldCheck size={20} /><div><b>Guidance, not a diagnosis</b><p>This demo cannot diagnose conditions. A clinician should review medical decisions. If symptoms are severe or life-threatening, contact emergency services now.</p></div></div>
        <Card className="checker-card">
          <div className="stepper"><span className={step >= 0 ? "done" : ""}>1</span><i /><span className={step >= 1 ? "done" : ""}>2</span><i /><span className={step >= 2 ? "done" : ""}>3</span></div>
          {step === 0 && <>
            <p className="eyebrow">Step 1 of 3</p><h2>What are you experiencing?</h2><p>Describe your symptoms in your own words.</p>
            <textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder="For example: I have had a headache and mild fever since yesterday..." />
            <div className="suggestions">{["Headache", "Fever", "Cough", "Stomach pain"].map((s) => <button key={s} onClick={() => setSymptoms((v) => `${v}${v ? ", " : ""}${s.toLowerCase()}`)}>+ {s}</button>)}</div>
            <PrimaryButton disabled={!symptoms.trim()} onClick={() => setStep(1)}>Continue <ArrowRight size={18} /></PrimaryButton>
          </>}
          {step === 1 && <>
            <p className="eyebrow">Step 2 of 3</p><h2>Help us understand more</h2>
            <label className="field-label">How long have you felt this way?<select><option>Today</option><option>2–3 days</option><option>About a week</option><option>Longer than a week</option></select></label>
            <label className="field-label">Severity: <b>{severity}/5</b><input type="range" min="1" max="5" value={severity} onChange={(e) => setSeverity(Number(e.target.value))} /></label>
            <label className="check-row"><input type="checkbox" /> I also feel unusually tired</label>
            <label className="check-row"><input type="checkbox" /> Symptoms affect my daily activities</label>
            <PrimaryButton onClick={() => setStep(2)}>Review guidance <Sparkles size={18} /></PrimaryButton>
          </>}
          {step === 2 && <>
            <span className="result-icon"><Brain size={28} /></span><p className="eyebrow">Demo assessment</p><h2>Consider speaking with a clinician</h2>
            <p>Based on “{symptoms}” and a severity of {severity}/5, several common causes may be possible. This assessment is uncertain and is not a diagnosis.</p>
            <div className="condition-list">
              <div><span><Activity size={19} /> Viral illness</span><small>Possible explanation</small></div>
              <div><span><Wind size={19} /> Dehydration or fatigue</span><small>Possible explanation</small></div>
            </div>
            <div className="warning-box"><Zap size={20} /><p><b>Seek urgent care</b> for chest pain, difficulty breathing, confusion, fainting, severe pain, or rapidly worsening symptoms.</p></div>
            <div className="button-row"><button className="secondary-button" onClick={() => { setStep(0); setSymptoms(""); }}>Start over</button><PrimaryButton onClick={() => window.print()}><Download size={18} /> Save report</PrimaryButton></div>
          </>}
        </Card>
      </div>
    </Page>
  );
}

function DoctorsPage() {
  const [filters, setFilters] = useState(defaultDoctorFilters);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState("Relevance");
  const [visible, setVisible] = useState(4);
  const [locationState, setLocationState] = useState("Location not enabled");
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const specialty = params.get("specialty");
    const condition = params.get("condition");
    if (specialty) setFilters((current) => ({ ...current, specialty }));
    if (condition) {
      const item = conditions.find((entry) => entry.slug === condition);
      if (item) setFilters((current) => ({ ...current, query: item.name }));
    }
  }, [location.search]);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(filters.query), 250);
    return () => window.clearTimeout(timer);
  }, [filters.query]);
  const update = (key: keyof typeof filters, value: string | number | boolean) => setFilters((current) => ({ ...current, [key]: value }));
  const filtered = useMemo(() => {
    const result = searchDoctors({ ...filters, query: debouncedQuery });
    return [...result].sort((a, b) => {
      if (sort === "Experience") return yearsOfExperience(b) - yearsOfExperience(a);
      if (sort === "Fee: low to high") return a.fee - b.fee;
      if (sort === "Availability") return b.availability.length - a.availability.length;
      return discoveryReasons(debouncedQuery, b).length - discoveryReasons(debouncedQuery, a).length;
    });
  }, [filters, debouncedQuery, sort]);
  const suggestions = suggestedSpecialties(debouncedQuery);
  const urgent = urgentTerms.some((term) => debouncedQuery.toLowerCase().includes(term));
  const enableLocation = () => {
    if (!navigator.geolocation) return setLocationState("Location is unavailable in this browser");
    setLocationState("Requesting permission…");
    navigator.geolocation.getCurrentPosition(
      () => setLocationState("Location enabled — distance requires a configured map provider"),
      () => setLocationState("Location permission was not granted"),
    );
  };
  return (
    <Page title="Find a doctor" eyebrow="Advanced fictional provider directory" action={<button className={`icon-button ${showFilters ? "selected" : ""}`} onClick={() => setShowFilters(!showFilters)} aria-label="Toggle advanced filters"><Settings size={21} /></button>}>
      <DirectoryNav />
      <div className="search-panel">
        <div className="search-box"><Search size={20} /><input aria-label="Search doctors, specialties, conditions, symptoms, or clinics" value={filters.query} onChange={(e) => update("query", e.target.value)} placeholder="Doctor, specialty, condition, symptom, or clinic" />{filters.query && <button aria-label="Clear search" onClick={() => update("query", "")}><X size={17} /></button>}</div>
        <select aria-label="Filter by specialty" value={filters.specialty} onChange={(e) => update("specialty", e.target.value)}><option>All specialties</option>{allSpecialties.map((item) => <option key={item.name}>{item.name}</option>)}</select>
      </div>
      {urgent && <div className="urgent-guidance"><Zap size={20} /><div><b>Urgent symptoms need urgent care</b><p>Search results are not emergency advice. Contact local emergency services now for severe or life-threatening symptoms.</p></div></div>}
      {showFilters && <Card className="advanced-filters">
        <label>Location<select value={filters.city} onChange={(e) => update("city", e.target.value)}><option>All locations</option>{[...new Set(doctors.map((doctor) => doctor.city))].map((city) => <option key={city}>{city}</option>)}</select></label>
        <label>Language<select value={filters.language} onChange={(e) => update("language", e.target.value)}><option>All languages</option>{[...new Set(doctors.flatMap((doctor) => doctor.languages))].sort().map((language) => <option key={language}>{language}</option>)}</select></label>
        <label>Age group<select value={filters.ageGroup} onChange={(e) => update("ageGroup", e.target.value)}><option>All age groups</option><option>Children</option><option>Adults</option><option>Older adults</option></select></label>
        <label>Consultation<select value={filters.mode} onChange={(e) => update("mode", e.target.value)}><option>Any consultation</option><option>Video</option><option>In-person</option></select></label>
        <label>Maximum fee <b>₹{filters.maxFee}</b><input type="range" min="500" max="2000" step="100" value={filters.maxFee} onChange={(e) => update("maxFee", Number(e.target.value))} /></label>
        <label>Experience<select value={filters.minExperience} onChange={(e) => update("minExperience", Number(e.target.value))}><option value="0">Any experience</option><option value="5">5+ years</option><option value="10">10+ years</option><option value="15">15+ years</option></select></label>
        <label>Available date<select value={filters.availableDate} onChange={(e) => update("availableDate", e.target.value)}><option>Any date</option><option>Today</option><option>Tomorrow</option><option>Thursday</option><option>Friday</option><option>Saturday</option></select></label>
        <label className="check-row"><input type="checkbox" checked={filters.available} onChange={(e) => update("available", e.target.checked)} /> Has appointment availability</label>
        <label className="check-row"><input type="checkbox" checked={filters.verifiedOnly} onChange={(e) => update("verifiedOnly", e.target.checked)} /> Verified credentials only</label>
        <label className="check-row"><input type="checkbox" checked={filters.insuranceOnly} onChange={(e) => update("insuranceOnly", e.target.checked)} /> Verified insurance only</label>
        <button className="location-button" onClick={enableLocation}><MapPin size={17} /> {locationState}</button>
        <div className="filter-note"><ShieldCheck size={17} /> Verified credentials and accepted insurance filters require a connected, audited provider database. No demo profile is marked verified.</div>
        <button className="text-button" onClick={() => setFilters(defaultDoctorFilters)}>Reset all filters</button>
      </Card>}
      {!!suggestions.length && <div className="discovery-strip"><div><Sparkles size={18} /><span><b>Discovery suggestions</b><small>Based on transparent condition-to-specialty rules, not a diagnosis</small></span></div>{suggestions.slice(0, 4).map((specialty) => <button key={specialty} onClick={() => update("specialty", specialty)}>{specialty}</button>)}</div>}
      <div className="section-heading compact"><div><p className="eyebrow">Fictional data • credentials unverified</p><h2>{filtered.length} matching profiles</h2></div><select className="sort-select" aria-label="Sort doctors" value={sort} onChange={(e) => setSort(e.target.value)}><option>Relevance</option><option>Experience</option><option>Availability</option><option>Fee: low to high</option><option disabled>Genuine rating — no eligible reviews</option></select></div>
      <div className="doctor-list">
        {filters.query !== debouncedQuery && [1, 2, 3].map((item) => <div className="doctor-skeleton" aria-label="Loading search results" key={item}><i /><span><b /><b /><b /></span></div>)}
        {filters.query === debouncedQuery && filtered.slice(0, visible).map((doctor) => (
          <Card key={doctor.id} className="doctor-card" onClick={() => navigate(`/doctors/${doctor.id}`)}>
            <div className="doctor-photo"><img src={doctor.photo} alt={`Portrait used for fictional profile ${doctor.name}`} /><span>Unverified demo</span></div>
            <div className="grow"><span className="demo-label">Fictional profile • {doctor.verification}</span><h3>{doctor.name}</h3><p>{doctor.primarySpecialty} {doctor.additionalSpecialties.length ? `• ${doctor.additionalSpecialties[0]}` : ""}</p>
              <div className="doctor-details"><span><Hospital size={15} /> {yearsOfExperience(doctor)} years</span><span><MapPin size={15} /> {doctor.city}</span><span><Languages size={15} /> {doctor.languages.slice(0, 2).join(", ")}</span></div>
              {discoveryReasons(debouncedQuery, doctor).map((reason) => <div className="match-reason" key={reason}><Sparkles size={14} /> Why shown: {reason}</div>)}
              <div className="availability"><Clock3 size={15} /> Next demo slot: <b>{doctor.availability[0] ?? "No slots listed"}</b></div>
            </div>
            <div className="doctor-cta"><b>₹{doctor.fee.toLocaleString()}</b><small>Demo fee</small><button onClick={(e) => { e.stopPropagation(); navigate(`/doctors/${doctor.id}`); }}>View profile</button></div>
          </Card>
        ))}
        {filters.query === debouncedQuery && !filtered.length && <div className="empty-state"><Search size={28} /><h3>No matching profile is listed</h3><p>Try broader filters, another nearby demo location, or explore a related specialty. Search results do not determine which care is medically appropriate.</p><div className="button-row"><button className="secondary-button" onClick={() => setFilters(defaultDoctorFilters)}>Clear filters</button><button className="primary-button" onClick={() => navigate("/specialties")}>Explore specialties</button></div></div>}
      </div>
      {visible < filtered.length && <button className="load-more" onClick={() => setVisible((count) => count + 4)}>Load more profiles</button>}
    </Page>
  );
}

function DoctorProfile() {
  const { doctorId = "" } = useParams();
  const doctor = doctors.find((item) => item.id === doctorId);
  const [tab, setTab] = useState("About");
  const [favorite, setFavorite] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("");
  const navigate = useNavigate();
  if (!doctor) return <NotFound />;
  return (
    <Page title="Doctor profile" eyebrow="Fictional demonstration data" back action={<div className="profile-actions"><button className={`icon-button ${favorite ? "selected" : ""}`} aria-label={favorite ? "Remove from favorites" : "Save to favorites"} onClick={() => setFavorite(!favorite)}><Heart size={20} fill={favorite ? "currentColor" : "none"} /></button><button className="icon-button" aria-label="Share profile" onClick={() => navigator.clipboard?.writeText(window.location.href)}><ArrowRight size={20} /></button></div>}>
      <div className="unverified-banner"><ShieldCheck size={20} /><div><b>Fictional profile — credentials not verified</b><p>Do not use this profile to make a real healthcare decision. Production profiles must be checked against the relevant registration authority before publication.</p></div></div>
      <Card className="profile-hero">
        <div className="profile-photo"><img src={doctor.photo} alt={`Portrait used for fictional profile ${doctor.name}`} /><span>Demo</span></div>
        <div className="grow"><p className="eyebrow">{doctor.primarySpecialty}</p><h2>{doctor.name}</h2><p>{doctor.qualifications.join(" • ")}</p><div className="credential-line"><span className="pending-dot" /> Credential review: {doctor.verification}</div><div className="mode-row">{doctor.modes.map((mode) => <span key={mode}>{mode === "Video" ? <Video size={14} /> : <Hospital size={14} />}{mode}</span>)}</div></div>
        <div className="fee-box"><small>Demo consultation fee</small><b>₹{doctor.fee.toLocaleString()}</b><span>INR</span></div>
      </Card>
      <div className="stat-grid"><Card><b>{yearsOfExperience(doctor)}</b><span>Years from demo career date</span></Card><Card><b>{doctor.languages.length}</b><span>Languages listed</span></Card><Card><b>0</b><span>Genuine eligible reviews</span></Card></div>
      <div className="tabs profile-tabs">{["About", "Expertise", "Clinic", "Reviews", "Availability"].map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>
      <div className="profile-content">
        {tab === "About" && <div className="profile-two-col"><Card><h3>Professional overview</h3><p>{doctor.biography}</p><dl className="profile-facts"><div><dt>Primary specialty</dt><dd>{doctor.primarySpecialty}</dd></div><div><dt>Additional specialties</dt><dd>{doctor.additionalSpecialties.join(", ") || "None listed"}</dd></div><div><dt>Registration</dt><dd>{doctor.registration}</dd></div><div><dt>Jurisdiction</dt><dd>{doctor.jurisdiction}</dd></div><div><dt>Languages</dt><dd>{doctor.languages.join(", ")}</dd></div><div><dt>Age groups</dt><dd>{doctor.ageGroups.join(", ")}</dd></div></dl></Card><Card><h3>Qualifications</h3>{doctor.qualifications.map((qualification) => <div className="qualification-row" key={qualification}><FileText size={18} /><span>{qualification}<small>Unverified demo entry</small></span></div>)}<div className="scope-note"><ShieldCheck size={18} /> Services are configured per profile and do not imply that every clinician in this specialty offers the same care.</div></Card></div>}
        {tab === "Expertise" && <div className="profile-two-col"><Card><h3>Configured conditions</h3><div className="tag-list">{doctor.conditions.map((slug) => { const condition = conditions.find((item) => item.slug === slug); return condition ? <Link key={slug} to={`/conditions/${slug}`}>{condition.name}<ChevronRight size={14} /></Link> : null; })}</div></Card><Card><h3>Services and procedures</h3><ul className="clean-list">{doctor.services.map((item) => <li key={item}><CheckCircle2 size={17} />{item}</li>)}</ul><h3>May require referral</h3><ul className="clean-list referral">{doctor.referrals.map((item) => <li key={item}><ArrowRight size={17} />{item}</li>)}</ul></Card></div>}
        {tab === "Clinic" && <div className="profile-two-col"><Card><h3>Clinic affiliation</h3><div className="location-row"><span><MapPin size={20} /></span><div><b>{doctor.clinic}</b><p>{doctor.address}</p></div></div><div className="map-demo profile-map"><div className="map-grid" /><span className="clinic-pin"><Hospital size={18} /></span><p>Map placeholder — coordinates not configured</p></div><button className="secondary-button full" onClick={() => window.alert("Connect a map provider and verified clinic coordinates for directions.")}><Navigation size={17} /> Get directions</button></Card><Card><h3>Working hours</h3><div className="hours-list"><div><span>Monday–Friday</span><b>9:00 AM–6:00 PM</b></div><div><span>Saturday</span><b>9:00 AM–1:00 PM</b></div><div><span>Sunday</span><b>Closed</b></div></div><h3>Facilities and affiliations</h3><ul className="clean-list">{doctor.facilities.map((item) => <li key={item}><Hospital size={17} />{item}</li>)}</ul></Card></div>}
        {tab === "Reviews" && <Card><div className="empty-state compact-empty"><MessageCircle size={30} /><h3>No genuine eligible reviews</h3><p>Fictional reviews and ratings are not displayed. Production reviews must be linked to eligible appointments, moderated, reportable, and included in the average only after approval.</p><button className="secondary-button" onClick={() => window.alert("Report-profile workflow opened for this fictional record.")}><FlagIcon /> Report profile information</button></div></Card>}
        {tab === "Availability" && <div className="profile-two-col"><Card><h3>Select a demo appointment</h3><div className="mini-calendar"><b>September 2025</b><div>{["22", "23", "24", "25", "26", "27", "28"].map((day, index) => <button className={index === 2 ? "active" : ""} key={day}>{day}</button>)}</div></div><div className="slots">{doctor.availability.map((slot) => <button className={selectedSlot === slot ? "active" : ""} key={slot} onClick={() => setSelectedSlot(slot)}>{slot}</button>)}</div></Card><Card><h3>Booking details</h3><div className="summary-list"><div><span>Selected time</span><b>{selectedSlot || "Choose a slot"}</b></div><div><span>Fee</span><b>₹{doctor.fee.toLocaleString()} INR</b></div><div><span>Cancellation</span><b>24-hour demo policy</b></div></div><PrimaryButton disabled={!selectedSlot} onClick={() => navigate("/booking")}>Continue to booking</PrimaryButton></Card></div>}
      </div>
      <div className="sticky-action"><div><small>Demo consultation fee</small><b>₹{doctor.fee.toLocaleString()}</b></div><PrimaryButton onClick={() => { setTab("Availability"); window.scrollTo({ top: 520, behavior: "smooth" }); }}>View availability <ArrowRight size={18} /></PrimaryButton></div>
    </Page>
  );
}

function FlagIcon() {
  return <ShieldCheck size={17} />;
}

function DirectoryNav() {
  return <nav className="directory-nav" aria-label="Doctor discovery sections"><NavLink end to="/doctors">Doctors</NavLink><NavLink to="/specialties">Specialties</NavLink><NavLink to="/conditions">Conditions</NavLink><NavLink to="/admin/providers">Admin demo</NavLink></nav>;
}

function SpecialtyExplorer() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All Specialties");
  const navigate = useNavigate();
  const tabs = ["All Specialties", ...specialtyCategories.map((item) => item.shortName)];
  const visible = specialtyCategories.filter((item) => (category === "All Specialties" || item.shortName === category) && [item.name, ...item.specialties, ...item.conditions].join(" ").toLowerCase().includes(query.toLowerCase()));
  return <Page title="Explore specialties" eyebrow="Complete medical directory" action={<Link className="header-link" to="/doctors">Advanced search</Link>}><DirectoryNav /><div className="search-box page-search"><Search size={20} /><input aria-label="Search specialties" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search specialty or care area" /></div><div className="category-tabs">{tabs.map((tab) => <button className={tab === category ? "active" : ""} onClick={() => setCategory(tab)} key={tab}>{tab}</button>)}</div><div className="specialty-grid">{visible.map((item) => { const count = doctors.filter((doctor) => item.specialties.includes(doctor.primarySpecialty) || doctor.additionalSpecialties.some((specialty) => item.specialties.includes(specialty))).length; return <Card className="specialty-card" key={item.id}><span className="specialty-icon"><Stethoscope size={23} /></span><div><p className="eyebrow">{item.shortName}</p><h2>{item.name}</h2><p>{item.description}</p></div><div className="condition-preview">{item.conditions.slice(0, 3).map((condition) => <span key={condition}>{condition}</span>)}</div><div className="specialty-footer"><span><b>{count}</b> fictional profiles currently listed</span><button onClick={() => navigate(`/specialties/${item.id}`)}>Explore <ArrowRight size={16} /></button></div></Card>; })}</div>{!visible.length && <div className="empty-state"><Search size={28} /><h3>No specialties match</h3><p>Try a broader care area or reset the category.</p></div>}</Page>;
}

function SpecialtyDetail() {
  const { specialtySlug = "" } = useParams();
  const category = specialtyCategories.find((item) => item.id === specialtySlug);
  const specialty = getSpecialty(specialtySlug);
  const navigate = useNavigate();
  if (!category && !specialty) return <NotFound />;
  const title = category?.name ?? specialty!.name;
  const description = category?.description ?? `Explore fictional profiles and educational care areas related to ${specialty!.name}.`;
  const specialtyNames = category?.specialties ?? [specialty!.name];
  const careAreas = category?.conditions ?? conditions.filter((condition) => condition.specialties.includes(specialty!.name)).map((condition) => condition.name);
  const matched = doctors.filter((doctor) => specialtyNames.includes(doctor.primarySpecialty) || doctor.additionalSpecialties.some((item) => specialtyNames.includes(item)));
  return <Page title={title} eyebrow="Specialty overview" back><div className="specialty-hero"><div><span className="live-pill pale"><Stethoscope size={15} /> Educational directory</span><h2>{description}</h2><p>Exact services vary by clinician, qualifications, setting, and individual circumstances. A referral may be needed for diagnostic or procedural specialties.</p><PrimaryButton onClick={() => navigate(`/doctors?specialty=${encodeURIComponent(specialtyNames[0])}`)}>Find doctors <ArrowRight size={18} /></PrimaryButton></div><span><Hospital size={48} /></span></div><div className="profile-two-col"><Card><h3>Specialties in this area</h3><div className="tag-list">{specialtyNames.map((name) => <Link key={name} to={`/specialties/${slugify(name)}`}>{name}<ChevronRight size={14} /></Link>)}</div></Card><Card><h3>Common care areas</h3><div className="tag-list muted-tags">{careAreas.map((name) => <span key={name}>{name}</span>)}</div></Card></div><div className="section-heading compact"><div><p className="eyebrow">Fictional profiles</p><h2>{matched.length} currently listed</h2></div></div><div className="doctor-list">{matched.map((doctor) => <Card key={doctor.id} className="mini-doctor" onClick={() => navigate(`/doctors/${doctor.id}`)}><img src={doctor.photo} alt="" /><div className="grow"><span className="demo-label">Unverified demo</span><h3>{doctor.name}</h3><p>{doctor.primarySpecialty} • {doctor.city}</p></div><ChevronRight size={19} /></Card>)}{!matched.length && <div className="empty-state"><Stethoscope size={30} /><h3>No fictional profiles listed yet</h3><p>This specialty is ready for database-backed provider onboarding.</p></div>}</div></Page>;
}

function ConditionsPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const categories = [...new Set(conditions.map((item) => item.category))];
  const visible = conditions.filter((condition) => (category === "All categories" || condition.category === category) && [condition.name, ...condition.aliases, ...condition.specialties].join(" ").toLowerCase().includes(query.toLowerCase()));
  return <Page title="Conditions directory" eyebrow="Educational discovery, not diagnosis"><DirectoryNav /><div className="education-banner"><Brain size={21} /><div><b>Learn where to start</b><p>Symptoms alone cannot confirm a diagnosis. These pages offer educational context and transparent specialty suggestions only.</p></div></div><div className="search-panel"><div className="search-box"><Search size={20} /><input aria-label="Search conditions" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search condition or common name" /></div><select aria-label="Condition category" value={category} onChange={(e) => setCategory(e.target.value)}><option>All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></div><div className="condition-grid">{visible.map((condition) => <Link className="condition-card" to={`/conditions/${condition.slug}`} key={condition.slug}><span><FileHeart size={20} /></span><div><small>{condition.category}</small><h3>{condition.name}</h3><p>{condition.aliases.length ? `Also known as ${condition.aliases.join(", ")}` : condition.overview.slice(0, 72) + "…"}</p></div><ChevronRight size={18} /></Link>)}</div>{!visible.length && <div className="empty-state"><Search size={28} /><h3>No condition found</h3><p>Try another common name or browse all categories.</p></div>}</Page>;
}

function ConditionDetail() {
  const { conditionSlug = "" } = useParams();
  const condition = conditions.find((item) => item.slug === conditionSlug);
  const navigate = useNavigate();
  if (!condition) return <NotFound />;
  const specialists = doctors.filter((doctor) => doctor.conditions.includes(condition.slug));
  return <Page title={condition.name} eyebrow={condition.category} back><div className="condition-hero"><div><span className="live-pill pale"><FileHeart size={15} /> Educational overview</span><h2>{condition.aliases.length ? `Also called ${condition.aliases.join(", ")}` : "Condition guide"}</h2><p>{condition.overview}</p></div><div className="not-diagnosis"><ShieldCheck size={20} /><span>This page is not a personal diagnosis.</span></div></div><div className="condition-detail-grid"><Card><h3>Common symptoms</h3><p className="section-intro">Symptoms can have many causes and do not confirm this condition.</p><ul className="clean-list">{condition.symptoms.map((symptom) => <li key={symptom}><Activity size={17} />{symptom}</li>)}</ul></Card><Card><h3>Who may evaluate this?</h3><div className="tag-list">{condition.specialties.map((specialty) => <button key={specialty} onClick={() => navigate(`/doctors?specialty=${encodeURIComponent(specialty)}`)}>{specialty}<ArrowRight size={14} /></button>)}</div><p className="section-intro">These are discovery suggestions, not exclusive medical rules. The appropriate clinician depends on the individual situation.</p></Card><Card className="routine-card"><h3><CalendarDays size={18} /> Arrange a routine consultation</h3><p>{condition.routine}</p></Card><Card className="urgent-card"><h3><Zap size={18} /> Warning signs</h3><p>{condition.urgent}</p></Card></div><div className="section-heading compact"><div><p className="eyebrow">Configured expertise</p><h2>Fictional profiles</h2></div><PrimaryButton onClick={() => navigate(`/doctors?condition=${condition.slug}`)}>Find a specialist</PrimaryButton></div><div className="doctor-list">{specialists.map((doctor) => <Card key={doctor.id} className="mini-doctor" onClick={() => navigate(`/doctors/${doctor.id}`)}><img src={doctor.photo} alt="" /><div className="grow"><span className="demo-label">Unverified fictional profile</span><h3>{doctor.name}</h3><p>{doctor.primarySpecialty} • {doctor.services.find((service) => service.toLowerCase().includes(condition.name.split(" ")[0].toLowerCase())) ?? "Configured condition expertise"}</p></div><ChevronRight size={19} /></Card>)}</div></Page>;
}

function ProviderAdmin() {
  const [records, setRecords] = useState(doctors.map((doctor) => ({ id: doctor.id, status: doctor.verification as "Pending" | "Rejected" | "Verified" })));
  const [selected, setSelected] = useState(doctors[0].id);
  const doctor = doctors.find((item) => item.id === selected)!;
  const setStatus = (status: "Pending" | "Rejected" | "Verified") => {
    if (status === "Verified") {
      window.alert("Demo guardrail: a profile cannot be marked verified without an authenticated administrator and evidence from the relevant registration authority.");
      return;
    }
    setRecords((items) => items.map((item) => item.id === selected ? { ...item, status } : item));
  };
  return <Page title="Provider verification" eyebrow="Administrator workflow demo" back><div className="admin-warning"><LockKeyhole size={20} /><div><b>Frontend demonstration only</b><p>Production access must require an administrator role enforced by server-side authorization and RLS. No profile can be verified in this demo.</p></div></div><div className="admin-layout"><Card className="admin-list"><div className="admin-list-head"><h3>Provider queue</h3><span>{records.filter((item) => item.status === "Pending").length} pending</span></div>{doctors.map((item) => { const status = records.find((record) => record.id === item.id)!.status; return <button className={selected === item.id ? "active" : ""} key={item.id} onClick={() => setSelected(item.id)}><img src={item.photo} alt="" /><span><b>{item.name}</b><small>{item.primarySpecialty}</small></span><i className={status.toLowerCase()}>{status}</i></button>; })}</Card><div className="admin-review"><Card><div className="admin-profile-head"><img src={doctor.photo} alt="" /><div><p className="eyebrow">Review record</p><h2>{doctor.name}</h2><p>{doctor.primarySpecialty} • {doctor.clinic}</p></div></div><div className="verification-checklist">{["Identity and professional title", "Qualifications and issuing institutions", "Registration authority and current standing", "Clinic affiliation", "Services, conditions, and scope", "Fees and appointment availability"].map((item, index) => <label key={item}><input type="checkbox" /><span><b>{item}</b><small>{index === 2 ? "Required before profile approval" : "Evidence not uploaded in demo mode"}</small></span></label>)}</div><label className="field-label">Reviewer notes<textarea placeholder="Document evidence, discrepancies, and follow-up requirements" /></label><div className="admin-actions"><button className="reject-button" onClick={() => setStatus("Rejected")}>Reject</button><button className="secondary-button" onClick={() => setStatus("Pending")}>Keep pending</button><button className="primary-button" onClick={() => setStatus("Verified")}><ShieldCheck size={17} /> Verify profile</button></div></Card><Card className="audit-card"><h3>Required production controls</h3><p>Immutable audit log, evidence access controls, dual-review policy, authority checks, suspension workflow, report moderation, and publication-state enforcement.</p></Card></div></div></Page>;
}

function BookingPage() {
  const [step, setStep] = useState(1);
  const [date, setDate] = useState("24");
  const [time, setTime] = useState("10:30 AM");
  const [type, setType] = useState("Video consultation");
  const navigate = useNavigate();
  return (
    <Page title={step < 4 ? "Book appointment" : "Appointment confirmed"} eyebrow={step < 4 ? `Step ${step} of 3` : "You're all set"} back>
      <div className="booking-layout">
        <Card className="booking-doctor"><img src={doctorPhoto} alt="Sample profile of Dr. Priya Sharma" /><div><span className="demo-label">Sample booking</span><h3>Dr. Priya Sharma</h3><p>General Physician • ₹800</p></div></Card>
        {step < 4 && <div className="stepper booking-steps"><span className={step >= 1 ? "done" : ""}>1</span><i /><span className={step >= 2 ? "done" : ""}>2</span><i /><span className={step >= 3 ? "done" : ""}>3</span></div>}
        <Card className="booking-main">
          {step === 1 && <><h2>Choose a date and time</h2><p>Select an available appointment slot.</p><div className="date-strip">{["23", "24", "25", "26", "27"].map((d, i) => <button key={d} className={date === d ? "active" : ""} onClick={() => setDate(d)}><small>{["Tue", "Wed", "Thu", "Fri", "Sat"][i]}</small><b>{d}</b></button>)}</div><h3>Available times</h3><div className="slots">{["09:00 AM", "10:30 AM", "01:00 PM", "04:30 PM", "06:00 PM"].map((s) => <button className={time === s ? "active" : ""} key={s} onClick={() => setTime(s)}>{s}</button>)}</div><PrimaryButton onClick={() => setStep(2)}>Continue <ArrowRight size={18} /></PrimaryButton></>}
          {step === 2 && <><h2>Visit details</h2><p>Who is this appointment for?</p><label className="field-label">Patient name<input defaultValue="Rohan Sharma" /></label><label className="field-label">Reason for visit<textarea placeholder="Briefly describe what you’d like help with" /></label><h3>Consultation type</h3><div className="choice-cards">{["Video consultation", "Clinic visit"].map((c) => <button className={type === c ? "active" : ""} key={c} onClick={() => setType(c)}>{c === "Video consultation" ? <Video size={20} /> : <Hospital size={20} />}<span><b>{c}</b><small>{c === "Video consultation" ? "Join securely from anywhere" : "Apollo Hospitals, New Delhi"}</small></span><CheckCircle2 size={18} /></button>)}</div><PrimaryButton onClick={() => setStep(3)}>Review booking <ArrowRight size={18} /></PrimaryButton></>}
          {step === 3 && <><h2>Review and confirm</h2><div className="summary-list"><div><span>Date</span><b>September {date}, 2025</b></div><div><span>Time</span><b>{time}</b></div><div><span>Type</span><b>{type}</b></div><div><span>Patient</span><b>Rohan Sharma</b></div><div className="total"><span>Total</span><b>₹800</b></div></div><div className="info-box"><ShieldCheck size={20} /><p>No payment will be processed in demo mode. Continue to see the confirmation experience.</p></div><PrimaryButton onClick={() => setStep(4)}>Confirm demo booking <Check size={18} /></PrimaryButton></>}
          {step === 4 && <div className="success-state"><span><Check size={36} /></span><h2>Your appointment is booked</h2><p>This is a simulated confirmation. No live doctor or payment service is connected.</p><div className="reference">Appointment reference <b>MC-240925-1030</b></div><Card><CalendarDays size={20} /><div><b>September {date} at {time}</b><p>{type} with Dr. Priya Sharma</p></div></Card><div className="button-row"><button className="secondary-button" onClick={() => navigate("/")}>Go home</button><PrimaryButton onClick={() => navigate("/appointments")}>Track appointment</PrimaryButton></div></div>}
        </Card>
      </div>
    </Page>
  );
}

function AppointmentsPage() {
  const navigate = useNavigate();
  return (
    <Page title="Appointments" eyebrow="Your care schedule" action={<PrimaryButton className="desktop-button" onClick={() => navigate("/booking")}><Plus size={18} /> Book new</PrimaryButton>}>
      <div className="tabs"><button className="active">Upcoming</button><button>Completed</button><button>Cancelled</button></div>
      <Card className="tracking-card">
        <div className="tracking-top"><span className="status-pill">Arrived</span><span className="demo-label">Demonstration status</span></div>
        <div className="tracking-doctor"><img src={doctorPhoto} alt="Sample profile of Dr. Priya Sharma" /><div className="grow"><h2>Dr. Priya Sharma</h2><p>General Physician • Apollo Hospitals</p><div className="inline-meta"><CalendarDays size={16} /> Today, 10:30 AM <span>•</span> Clinic visit</div></div><button className="icon-button" onClick={() => navigate("/video")}><Video size={20} /></button></div>
        <div className="timeline">{["Booked", "Arrived", "In consultation", "Completed"].map((s, i) => <div className={i < 2 ? "complete" : ""} key={s}><span>{i < 2 ? <Check size={15} /> : i + 1}</span><small>{s}</small></div>)}</div>
        <div className="map-demo"><div className="map-grid" /><span className="clinic-pin"><Hospital size={18} /></span><span className="user-pin"><Navigation size={18} /></span><div className="eta"><small>Estimated travel</small><b>12 min</b></div><p>Map preview — no live GPS data</p></div>
        <div className="tracking-actions"><button className="secondary-button" onClick={() => window.alert("Demo directions only. Connect a map provider for live routing.")}><Navigation size={18} /> Directions</button><PrimaryButton onClick={() => window.alert("Cancellation request demo opened.")}>Manage appointment</PrimaryButton></div>
      </Card>
      <div className="section-heading compact"><h2>Other upcoming</h2></div>
      <Card className="mini-appointment"><div className="calendar-tile"><b>29</b><small>SEP</small></div><div className="grow"><h3>Complete Blood Count</h3><p>Home sample collection • 8:00–9:00 AM</p></div><ChevronRight size={19} /></Card>
    </Page>
  );
}

function PrescriptionPage() {
  const [saved, setSaved] = useState(true);
  return (
    <Page title="Digital prescription" eyebrow="Sample clinical document" back>
      <div className="document-card">
        <div className="document-head"><Brand /><span><b>Prescription</b><small>Issued 23 Sep 2025</small></span></div>
        <div className="prescription-party"><div><small>CLINICIAN</small><b>Dr. Priya Sharma</b><p>General Physician • Sample credentials</p></div><div><small>PATIENT</small><b>Rohan Sharma</b><p>34 years • Male</p></div></div>
        <div className="rx">Rx</div>
        <div className="medicine-list">
          <div><span><Pill size={21} /></span><div><h3>Amoxicillin 500mg</h3><p>1 capsule • Twice daily • 5 days</p><small>After meals. Follow clinician instructions.</small></div></div>
          <div><span><Pill size={21} /></span><div><h3>Paracetamol 650mg</h3><p>1 tablet • As directed</p><small>Do not exceed the clinician-prescribed amount.</small></div></div>
          <div><span><Activity size={21} /></span><div><h3>Rest and hydration</h3><p>Drink fluids and monitor symptoms</p></div></div>
        </div>
        <div className="clinical-note"><b>Important:</b> This prescription is sample data and is not valid for dispensing. Patients cannot create or modify clinician prescriptions.</div>
        <div className="signature"><span>Digitally signed</span><b>Dr. Priya Sharma</b></div>
      </div>
      <div className="document-actions"><PrimaryButton onClick={() => window.print()}><Download size={18} /> Download / print</PrimaryButton><button className="secondary-button" onClick={() => navigator.clipboard?.writeText(window.location.href)}>Share securely</button><button className={`save-button ${saved ? "saved" : ""}`} onClick={() => setSaved(!saved)}><CheckCircle2 size={18} /> {saved ? "Saved to health records" : "Save to health records"}</button></div>
    </Page>
  );
}

const tests = [
  ["Complete Blood Count (CBC)", "Blood", "₹800", "1–2 hrs"],
  ["Thyroid Profile (T3, T4, TSH)", "Blood", "₹1,200", "3–4 hrs"],
  ["Lipid Profile", "Heart health", "₹1,000", "2–3 hrs"],
  ["Vitamin D", "Wellness", "₹1,450", "24 hrs"],
  ["HbA1c", "Diabetes", "₹650", "2 hrs"],
];

function LabsPage() {
  const [query, setQuery] = useState("");
  const [booked, setBooked] = useState<string[]>([]);
  const filtered = tests.filter((t) => t[0].toLowerCase().includes(query.toLowerCase()));
  return (
    <Page title="Lab tests" eyebrow="Illustrative catalog and pricing" action={<Link className="header-link" to="/records">View results</Link>}>
      <div className="search-box page-search"><Search size={20} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search lab tests" /></div>
      <div className="category-row">{["All", "Blood", "Heart", "Diabetes", "Wellness"].map((c, i) => <button className={i === 0 ? "active" : ""} key={c}>{c}</button>)}</div>
      <div className="lab-layout">
        <div className="lab-list">
          {filtered.map(([name, category, price, time]) => (
            <Card className="lab-card" key={name}>
              <span className="lab-icon"><FlaskConical size={21} /></span><div className="grow"><small>{category}</small><h3>{name}</h3><p>Reports in {time} • Fasting guidance provided at booking</p><span className="demo-label">Illustrative price</span></div><div className="lab-price"><b>{price}</b><button className={booked.includes(name) ? "booked" : ""} onClick={() => setBooked((v) => v.includes(name) ? v.filter((n) => n !== name) : [...v, name])}>{booked.includes(name) ? <Check size={16} /> : <Plus size={16} />}{booked.includes(name) ? "Added" : "Add"}</button></div>
            </Card>
          ))}
        </div>
        <Card className="lab-cart"><p className="eyebrow">Your booking</p><h2>{booked.length ? `${booked.length} test${booked.length > 1 ? "s" : ""} selected` : "Build your test package"}</h2><p>{booked.length ? "Choose home collection or a lab visit at checkout." : "Add tests from the catalog to get started."}</p>{booked.map((b) => <div className="cart-line" key={b}><span>{b}</span><button onClick={() => setBooked((v) => v.filter((n) => n !== b))}><X size={16} /></button></div>)}<div className="choice-cards small"><button className="active"><Home size={19} /><span><b>Home collection</b><small>Sample demo option</small></span></button><button><Hospital size={19} /><span><b>Visit a lab</b><small>Choose nearby center</small></span></button></div><PrimaryButton disabled={!booked.length} onClick={() => window.alert("Demo lab booking confirmed. No provider booking was created.")}>Choose date & time</PrimaryButton></Card>
      </div>
    </Page>
  );
}

function RecordsPage() {
  const [tab, setTab] = useState("Reports");
  const [uploaded, setUploaded] = useState<string[]>([]);
  const records = [
    ["Blood Test Report", "Complete Blood Count", "23 Sep 2025", "Normal"],
    ["X-Ray Report", "Chest PA View", "15 Sep 2025", "Reviewed"],
    ["MRI Scan Report", "Right Knee", "10 Sep 2025", "Follow-up"],
    ["Thyroid Profile", "T3, T4, TSH", "02 Sep 2025", "Normal"],
  ];
  return (
    <Page title="Health records" eyebrow="Private demo vault" action={<label className="upload-button"><Upload size={18} /> Upload<input type="file" onChange={(e) => e.target.files?.[0] && setUploaded((v) => [...v, e.target.files![0].name])} /></label>}>
      <div className="privacy-banner"><LockKeyhole size={20} /><div><b>Your records are private</b><p>Production uploads require private storage, authorization checks, and short-lived secure links.</p></div></div>
      <div className="tabs">{["Reports", "Vitals", "Documents"].map((t) => <button className={tab === t ? "active" : ""} onClick={() => setTab(t)} key={t}>{t}</button>)}</div>
      {tab === "Reports" && <div className="record-list">{records.map(([name, type, date, status]) => <Card className="record-card" key={name}><span><FileText size={22} /></span><div className="grow"><h3>{name}</h3><p>{type} • {date}</p></div><i className={status === "Follow-up" ? "attention" : ""}>{status}</i><button onClick={() => window.alert("Document preview opened in demo mode.")}>View <ChevronRight size={16} /></button></Card>)}</div>}
      {tab === "Vitals" && <div className="vitals-grid"><Card><span className="vital-icon red"><Heart size={21} /></span><small>Heart rate</small><h2>72 <em>bpm</em></h2><div className="spark-bars">{[30, 48, 34, 66, 46, 55, 43, 70, 52, 65].map((n, i) => <i key={i} style={{ height: `${n}%` }} />)}</div></Card><Card><span className="vital-icon blue"><Activity size={21} /></span><small>Blood pressure</small><h2>118/76</h2><p>Last updated yesterday</p></Card><Card><span className="vital-icon green"><Wind size={21} /></span><small>Blood oxygen</small><h2>98<em>%</em></h2><p>Within usual range</p></Card></div>}
      {tab === "Documents" && <div className="record-list">{uploaded.length ? uploaded.map((file) => <Card className="record-card" key={file}><span><FileText size={22} /></span><div className="grow"><h3>{file}</h3><p>Uploaded just now • Demo session only</p></div><button onClick={() => setUploaded((v) => v.filter((f) => f !== file))}>Delete</button></Card>) : <div className="empty-state"><Upload size={30} /><h3>No uploaded documents</h3><p>Use the upload button to add a demo file. It will not leave this session.</p></div>}</div>}
    </Page>
  );
}

function RemindersPage() {
  const [taken, setTaken] = useState<string[]>(["Vitamin D"]);
  const [enabled, setEnabled] = useState(true);
  const reminders = [["Amoxicillin 500mg", "08:00 AM", "After breakfast"], ["Vitamin D", "01:00 PM", "After lunch"], ["Amoxicillin 500mg", "08:00 PM", "After dinner"]];
  return (
    <Page title="Medication reminders" eyebrow="Your schedule" action={<button className="add-button" onClick={() => window.alert("Add-medication demo form opened. Follow an existing prescription; this app does not recommend doses.")}><Plus size={18} /> Add medication</button>}>
      <div className="reminder-date"><button><ArrowLeft size={18} /></button><div><p className="eyebrow">Today</p><h2>Wednesday, 24 September</h2></div><button><ArrowRight size={18} /></button></div>
      <div className="reminder-summary"><div><span><Pill size={23} /></span><div><h3>2 medications</h3><p>3 scheduled doses today</p></div></div><label className="toggle">Reminders<input type="checkbox" checked={enabled} onChange={() => setEnabled(!enabled)} /><i /></label></div>
      <div className="schedule">
        {reminders.map(([name, time, note], i) => {
          const isTaken = taken.includes(`${name}-${i}`) || (name === "Vitamin D" && taken.includes("Vitamin D"));
          return <Card className={`dose-card ${isTaken ? "complete" : ""}`} key={`${name}-${i}`}><div className="time-column"><b>{time}</b><small>{i === 2 ? "Evening" : i === 1 ? "Afternoon" : "Morning"}</small></div><span className="dose-icon"><Pill size={21} /></span><div className="grow"><h3>{name}</h3><p>{note} • Follow your prescription</p></div>{isTaken ? <span className="taken"><Check size={17} /> Taken</span> : <div className="dose-actions"><button onClick={() => setTaken((v) => [...v, `${name}-${i}`])}>Mark taken</button><button onClick={() => window.alert("Dose marked skipped in this demo session.")}>Skip</button></div>}</Card>;
        })}
      </div>
      <div className="disclaimer"><ShieldCheck size={18} /> Reminders only follow information you enter or a clinician provides. MediConnect does not prescribe medication or recommend doses.</div>
    </Page>
  );
}

function MentalHealthPage() {
  const [mood, setMood] = useState("");
  const [breathing, setBreathing] = useState(false);
  return (
    <Page title="Mental wellbeing" eyebrow="A calmer space for you" action={<button className="icon-button"><Heart size={20} /></button>}>
      <section className="mental-hero">
        <div><span className="live-pill pale"><MoonStar size={15} /> Daily check-in</span><h2>How are you feeling today?</h2><p>Take a quiet moment. Your check-in is sensitive and remains in this demo session only.</p><div className="moods">{[["Low", "◔"], ["Okay", "◡"], ["Good", "◠"], ["Great", "●"]].map(([m, icon]) => <button className={mood === m ? "active" : ""} onClick={() => setMood(m)} key={m}><span>{icon}</span>{m}</button>)}</div>{mood && <p className="mood-note"><CheckCircle2 size={17} /> Check-in saved for today</p>}</div>
        <div className={`breathing-orb ${breathing ? "active" : ""}`}><Wind size={38} /><b>{breathing ? "Breathe slowly" : "1 min reset"}</b><button onClick={() => setBreathing(!breathing)}>{breathing ? "Pause" : "Begin"}</button></div>
      </section>
      <div className="section-heading compact"><h2>Support for today</h2></div>
      <div className="support-grid"><Card><span className="support-icon purple"><Wind size={24} /></span><h3>Breathing space</h3><p>A guided 4–4 breathing exercise to help you reset.</p><button onClick={() => setBreathing(true)}>Start 4 minutes <ArrowRight size={17} /></button></Card><Card><span className="support-icon orange"><MoonStar size={24} /></span><h3>Evening unwind</h3><p>A short body scan for a gentler end to your day.</p><button onClick={() => window.alert("Meditation demo started.")}>Play 8 minutes <ArrowRight size={17} /></button></Card><Card><span className="support-icon green"><HeartHandshake size={24} /></span><h3>Talk to a therapist</h3><p>Browse sample licensed-provider profiles and session formats.</p><button onClick={() => window.alert("Therapist directory demo opened.")}>Find support <ArrowRight size={17} /></button></Card></div>
      <Card className="crisis-card"><ShieldCheck size={22} /><div><b>Need immediate support?</b><p>If you may harm yourself or someone else, contact local emergency services or a crisis hotline now. This app is not an emergency service.</p></div><button onClick={() => window.alert("Please contact your local emergency number or crisis service now.")}>Crisis guidance</button></Card>
    </Page>
  );
}

function VideoPage() {
  const [mic, setMic] = useState(true);
  const [camera, setCamera] = useState(true);
  const [chat, setChat] = useState(false);
  const navigate = useNavigate();
  return (
    <div className="video-page">
      <div className="video-top"><button onClick={() => navigate(-1)}><ArrowLeft size={21} /> Back</button><div><span className="status-dot" /> Interactive demo — not a live call</div><button onClick={() => setChat(!chat)}><MessageCircle size={20} /> Chat</button></div>
      <div className="video-stage">
        <img src={doctorPhoto} alt="Sample doctor shown in video consultation demo" />
        <div className="video-overlay"><span className="demo-label">Sample clinician video</span><h2>Dr. Priya Sharma</h2><p>General Physician</p></div>
        <div className={`self-video ${!camera ? "off" : ""}`}>{camera ? <div><UserRound size={42} /><span>You</span></div> : <><VideoOff size={28} /><span>Camera off</span></>}</div>
        {chat && <div className="chat-panel"><div><h3>Consultation chat</h3><button onClick={() => setChat(false)}><X size={18} /></button></div><p className="chat-notice">Messages are local demo content.</p><span className="chat-message">Hello, I’ve reviewed the notes you shared.</span><label><input placeholder="Type a message..." /><button><ArrowRight size={18} /></button></label></div>}
      </div>
      <div className="call-controls"><button className={!mic ? "off" : ""} onClick={() => setMic(!mic)}>{mic ? <Mic size={23} /> : <MicOff size={23} />}<span>{mic ? "Mute" : "Unmute"}</span></button><button className={!camera ? "off" : ""} onClick={() => setCamera(!camera)}>{camera ? <Camera size={23} /> : <VideoOff size={23} />}<span>{camera ? "Camera" : "Start video"}</span></button><button onClick={() => setChat(!chat)}><MessageCircle size={23} /><span>Chat</span></button><button className="end-call" onClick={() => navigate("/appointments")}><PhoneOff size={25} /><span>End demo</span></button></div>
    </div>
  );
}

function PaymentsPage() {
  const [method, setMethod] = useState("UPI");
  const [paid, setPaid] = useState(false);
  return (
    <Page title="Payment & insurance" eyebrow="Secure checkout demo" back>
      <div className="payment-layout">
        <div>
          <Card className="payment-summary"><p className="eyebrow">Appointment</p><div className="summary-doctor"><img src={doctorPhoto} alt="Sample profile of Dr. Priya Sharma" /><div><h3>Dr. Priya Sharma</h3><p>24 Sep, 10:30 AM • Video</p></div></div><div className="summary-list"><div><span>Consultation fee</span><b>₹800</b></div><div><span>Platform fee</span><b>₹0</b></div><div className="total"><span>Total</span><b>₹800</b></div></div></Card>
          <div className="secure-note"><LockKeyhole size={18} /> Test-mode interface. No payment is sent or stored.</div>
        </div>
        <Card className="payment-methods">
          {!paid ? <><h2>Choose payment method</h2><p>All options are non-functional demonstrations.</p>{[["UPI", WalletCards], ["Credit or debit card", CreditCard], ["Wallet", WalletCards], ["Health insurance", ShieldCheck]].map(([name, Icon]) => <button key={String(name)} onClick={() => setMethod(String(name))} className={method === name ? "active" : ""}><span><Icon size={21} /><b>{String(name)}</b></span><i>{method === name && <Check size={14} />}</i></button>)}{method === "Credit or debit card" && <div className="card-fields"><input placeholder="Card number (demo only)" /><div><input placeholder="MM / YY" /><input placeholder="CVV" /></div></div>}{method === "UPI" && <input className="payment-input" placeholder="UPI ID (demo only)" />}<PrimaryButton onClick={() => setPaid(true)}>Simulate payment ₹800 <ArrowRight size={18} /></PrimaryButton></> : <div className="success-state"><span><Check size={36} /></span><h2>Demo payment complete</h2><p>No money was charged. A real success screen must only appear after provider confirmation.</p><div className="reference">Demo transaction <b>MC-DEMO-8824</b></div><button className="secondary-button" onClick={() => window.print()}><Download size={18} /> View receipt</button></div>}
        </Card>
      </div>
    </Page>
  );
}

function SettingsPage() {
  const [tab, setTab] = useState("Family");
  const navigate = useNavigate();
  return (
    <Page title="Family & settings" eyebrow="Account preferences">
      <div className="settings-layout">
        <aside className="settings-tabs">{["Family", "Notifications", "Language", "Privacy & security", "Help & support"].map((t) => <button onClick={() => setTab(t)} className={tab === t ? "active" : ""} key={t}>{t === "Family" ? <UsersRound size={19} /> : t === "Notifications" ? <Bell size={19} /> : t === "Language" ? <Languages size={19} /> : t === "Privacy & security" ? <ShieldCheck size={19} /> : <MessageCircle size={19} />}<span>{t}</span><ChevronRight size={17} /></button>)}<button className="logout" onClick={() => navigate("/auth")}><ArrowRight size={19} /><span>Log out</span></button></aside>
        <div className="settings-content">
          {tab === "Family" && <><div className="section-heading compact"><div><p className="eyebrow">Authorized access only</p><h2>Family members</h2></div><button className="add-button" onClick={() => window.alert("Add-family-member demo opened. Record access requires explicit authorization.")}><Plus size={18} /> Add member</button></div><Card className="family-card"><span className="family-avatar">RS</span><div className="grow"><h3>Rohan Sharma</h3><p>You • Primary account</p></div><span className="status-pill">Active</span><ChevronRight size={18} /></Card><Card className="family-card"><span className="family-avatar child">AS</span><div className="grow"><h3>Aarav Sharma</h3><p>Child • Limited profile</p></div><span className="demo-label">Demo</span><ChevronRight size={18} /></Card><div className="info-box"><ShieldCheck size={20} /><p>Family members can only access health records they are explicitly permitted to view.</p></div></>}
          {tab === "Notifications" && <SettingsToggles title="Notification preferences" items={["Appointment reminders", "Medication reminders", "Lab result updates", "Wellness tips"]} />}
          {tab === "Language" && <><h2>Language</h2><p>Choose the language used across MediConnect.</p><div className="language-list">{["English", "हिन्दी", "বাংলা", "தமிழ்"].map((l, i) => <button className={i === 0 ? "active" : ""} key={l}>{l}{i === 0 && <Check size={18} />}</button>)}</div></>}
          {tab === "Privacy & security" && <SettingsToggles title="Privacy & security" items={["Sign in with biometrics", "Hide sensitive previews", "Two-step verification"]} />}
          {tab === "Help & support" && <><h2>How can we help?</h2><p>Browse common topics or reach the demonstration support flow.</p><div className="help-grid">{["Appointments & bookings", "Payments & refunds", "Health record privacy", "Contact support"].map((h) => <button key={h} onClick={() => window.alert(`${h} help article opened.`)}><MessageCircle size={20} />{h}<ChevronRight size={17} /></button>)}</div></>}
        </div>
      </div>
    </Page>
  );
}

function SettingsToggles({ title, items }: { title: string; items: string[] }) {
  const [active, setActive] = useState(items);
  return <><h2>{title}</h2><p>Control what you receive and how your account is protected.</p><div className="toggle-list">{items.map((item) => <label key={item}><span><b>{item}</b><small>Recommended for your care experience</small></span><span className="toggle"><input type="checkbox" checked={active.includes(item)} onChange={() => setActive((v) => v.includes(item) ? v.filter((x) => x !== item) : [...v, item])} /><i /></span></label>)}</div></>;
}

function NotFound() {
  return <Page title="Page not found" back><div className="empty-state"><Hospital size={36} /><h2>We couldn't find that page</h2><Link className="primary-button" to="/">Return home</Link></div></Page>;
}

const router = createBrowserRouter([
  {
    Component: AppShell,
    children: [
      { index: true, Component: HomePage },
      { path: "auth", Component: AuthPage },
      { path: "symptoms", Component: SymptomChecker },
      { path: "doctors", Component: DoctorsPage },
      { path: "doctors/:doctorId", Component: DoctorProfile },
      { path: "specialties", Component: SpecialtyExplorer },
      { path: "specialties/:specialtySlug", Component: SpecialtyDetail },
      { path: "conditions", Component: ConditionsPage },
      { path: "conditions/:conditionSlug", Component: ConditionDetail },
      { path: "admin/providers", Component: ProviderAdmin },
      { path: "booking", Component: BookingPage },
      { path: "appointments", Component: AppointmentsPage },
      { path: "prescription", Component: PrescriptionPage },
      { path: "labs", Component: LabsPage },
      { path: "records", Component: RecordsPage },
      { path: "reminders", Component: RemindersPage },
      { path: "mental-health", Component: MentalHealthPage },
      { path: "video", Component: VideoPage },
      { path: "payments", Component: PaymentsPage },
      { path: "settings", Component: SettingsPage },
      { path: "*", Component: NotFound },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
