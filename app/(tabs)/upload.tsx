import * as ImagePicker from 'expo-image-picker';
import type { CSSProperties, ChangeEvent } from "react";
import { useRef, useState } from "react";
import { Alert, Image, Text, TouchableOpacity, View } from 'react-native';
// ─── Design tokens ────────────────────────────────────────────────────────────
const PURPLE       = "#7C5CFC";
const PURPLE_LIGHT = "#F0EBFF";
const GREEN        = "#22C55E";
const GREEN_LIGHT  = "#DCFCE7";
const GRAY         = "#F5F5F7";
const GRAY_BORDER  = "#E5E7EB";
const TEXT_DARK    = "#111827";
const TEXT_MID     = "#6B7280";
const TEXT_LIGHT   = "#9CA3AF";

// ─── Static styles ────────────────────────────────────────────────────────────
const styles: Record<string, CSSProperties> = {
  page: {
    fontFamily: "'Plus Jakarta Sans', 'Nunito', sans-serif",
    background: "#FAFAFA",
    minHeight: "100dvh",
    maxWidth: 390,
    margin: "0 auto",
    overflowX: "hidden",
    boxSizing: "border-box",
    position: "relative",
    // Reserve space for: action bar (80px) + native tab bar (65px) + safe area
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px 20px",
    background: "#fff",
    borderBottom: `1px solid ${GRAY_BORDER}`,
    position: "sticky",
    top: 0,
    zIndex: 10,
    flexShrink: 0,
  },
  backBtn: {
    position: "absolute",
    left: 16,
    background: GRAY,
    border: "none",
    borderRadius: 10,
    width: 34,
    height: 34,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  headerTitle: { fontSize: 16, fontWeight: 700, color: TEXT_DARK },
  section: {
    background: "#fff",
    margin: "10px 16px",
    borderRadius: 16,
    padding: "18px 16px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  sectionNum: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: PURPLE_LIGHT,
    color: PURPLE,
    fontWeight: 700,
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: TEXT_DARK },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: TEXT_MID,
    marginBottom: 6,
    display: "block",
  },
  input: {
    width: "100%",
    border: `1.5px solid ${GRAY_BORDER}`,
    borderRadius: 10,
    padding: "11px 14px",
    fontSize: 14,
    color: TEXT_DARK,
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  select: {
    width: "100%",
    border: `1.5px solid ${GRAY_BORDER}`,
    borderRadius: 10,
    padding: "11px 14px",
    fontSize: 14,
    color: TEXT_DARK,
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
    appearance: "none",
    fontFamily: "inherit",
    cursor: "pointer",
  },
  selectWrap: { position: "relative", marginBottom: 12 },
  selectArrow: {
    position: "absolute",
    right: 14,
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
    color: TEXT_MID,
    fontSize: 12,
  },
  chipRow: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 },

  bottomBar: {
    background: "#fff",
    borderTop: `1px solid ${GRAY_BORDER}`,
    padding: "14px 16px",
    display: "flex",
    gap: 12,
    boxSizing: "border-box",
    margin: "10px 16px 24px",
    borderRadius: 16,
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SectionHeaderProps {
  num: string | number;
  title: string;
}
const SectionHeader = ({ num, title }: SectionHeaderProps) => (
  <div style={styles.sectionHeader}>
    <div style={styles.sectionNum}>{num}</div>
    <span style={styles.sectionTitle}>{title}</span>
  </div>
);

interface ChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  color?: string;
  icon?: string;
}
const Chip = ({ label, selected, onClick, color = PURPLE, icon }: ChipProps) => (
  <button
    onClick={onClick}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 5,
      padding: "7px 13px",
      borderRadius: 20,
      border: `1.5px solid ${selected ? color : GRAY_BORDER}`,
      background: selected ? (color === GREEN ? GREEN_LIGHT : PURPLE_LIGHT) : "#fff",
      color: selected ? color : TEXT_MID,
      fontSize: 13,
      fontWeight: selected ? 600 : 500,
      cursor: "pointer",
      fontFamily: "inherit",
      transition: "all 0.15s",
    }}
  >
    {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
    {label}
  </button>
);

interface TypeChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon: string;
}
const TypeChip = ({ label, selected, onClick, icon }: TypeChipProps) => (
  <button
    onClick={onClick}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "8px 14px",
      borderRadius: 12,
      border: `1.5px solid ${selected ? PURPLE : GRAY_BORDER}`,
      background: selected ? PURPLE_LIGHT : "#fff",
      color: selected ? PURPLE : TEXT_MID,
      fontSize: 13,
      fontWeight: selected ? 600 : 500,
      cursor: "pointer",
      fontFamily: "inherit",
    }}
  >
    <span style={{ fontSize: 15 }}>{icon}</span>
    {label}
  </button>
);

interface StepperProps {
  value: number;
  onChange: (val: number) => void;
}
const Stepper = ({ value, onChange }: StepperProps) => (
  <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
    <button
      onClick={() => onChange(Math.max(0, value - 1))}
      style={{
        width: 32, height: 32, borderRadius: "50%",
        border: `1.5px solid ${GRAY_BORDER}`,
        background: "#fff", fontSize: 18, color: TEXT_MID,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", fontFamily: "inherit",
      }}
    >−</button>
    <span style={{ width: 32, textAlign: "center", fontWeight: 700, fontSize: 15, color: TEXT_DARK }}>
      {value}
    </span>
    <button
      onClick={() => onChange(value + 1)}
      style={{
        width: 32, height: 32, borderRadius: "50%",
        border: `1.5px solid ${PURPLE}`,
        background: PURPLE_LIGHT, fontSize: 18, color: PURPLE,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", fontFamily: "inherit",
      }}
    >+</button>
  </div>
);

interface MediaFile { url: string; name: string; }

interface MediaUploadBoxProps {
  label: string;
  // When undefined/not passed → unlimited uploads
  max?: number;
  badge?: boolean;
}

// ── KEY FIX: max is now optional; when omitted the user can upload as many
//    files as they like. The "Add" button is always visible when max is not set.
const MediaUploadBox = ({ label, max }: { label: string; max?: number }) => {
  const [files, setFiles] = useState<string[]>([]);

  const handleAdd = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newUris = result.assets.map(a => a.uri);
      const remaining = max !== undefined ? max - files.length : Infinity;
      setFiles(prev => [...prev, ...newUris.slice(0, remaining)]);
    }
  };

  const canAddMore = max === undefined || files.length < max;

  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', marginBottom: 8 }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {files.map((uri, i) => (
          <Image key={i} source={{ uri }} style={{ width: 72, height: 72, borderRadius: 10 }} />
        ))}
        {canAddMore && (
          <TouchableOpacity onPress={handleAdd} style={{
            width: 72, height: 72, borderRadius: 10,
            borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#7C5CFC',
            backgroundColor: '#F0EBFF',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 24, color: '#7C5CFC' }}>+</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const DocUpload = () => {
  const ref = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<string[]>([]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFiles((prev) => [...prev, ...Array.from(e.target.files ?? []).map((f) => f.name)]);
  };

  return (
    <div>
      <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_DARK, display: "block", marginBottom: 8 }}>
        House Documents{" "}
        <span style={{ fontSize: 11, color: TEXT_LIGHT, fontWeight: 400 }}>(for review)</span>
      </span>
      <button
        onClick={() => ref.current?.click()}
        style={{
          width: "100%", padding: "13px", borderRadius: 12,
          border: `1.5px dashed ${GRAY_BORDER}`,
          background: GRAY, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 8, fontFamily: "inherit",
        }}
      >
        <span style={{ fontSize: 16 }}>📄</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_MID }}>Upload Documents</span>
        <span style={{ fontSize: 11, color: TEXT_LIGHT }}>PDF, JPG, PNG (Max 5MB)</span>
      </button>
      {files.length > 0 && (
        <div style={{ marginTop: 6 }}>
          {files.map((f, i) => (
            <div key={i} style={{ fontSize: 12, color: TEXT_MID, padding: "4px 0" }}>📎 {f}</div>
          ))}
        </div>
      )}
      <input
        ref={ref}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        multiple
        style={{ display: "none" }}
        onChange={handleChange}
      />
    </div>
  );
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const propTypes: { label: string; icon: string }[] = [
  { label: "Apartment", icon: "⊞" },
  { label: "Studio",    icon: "🏠" },
  { label: "Villa",     icon: "🏡" },
  { label: "Office",    icon: "🏢" },
  { label: "Room",      icon: "🚪" },
  { label: "Duplex",    icon: "🏘" },
];

const facilityList: { label: string; icon: string }[] = [
  { label: "Wifi",          icon: "📶" },
  { label: "Electricity",   icon: "⚡" },
  { label: "Water",         icon: "💧" },
  { label: "Gated",         icon: "🔒" },
  { label: "Parking",       icon: "🅿️" },
  { label: "Green Area",    icon: "🌿" },
  { label: "Generator",     icon: "⚙️" },
  { label: "Nearby School", icon: "🏫" },
];

const locationRows: { label: string; opts: string[] }[] = [
  { label: "Region",       opts: ["Centre", "Littoral", "West", "South"] },
  { label: "City",         opts: ["Yaoundé", "Douala", "Bafoussam", "Bamenda"] },
  { label: "Neighborhood", opts: ["Bastos", "Bonapriso", "Akwa", "Biyem-Assi"] },
];

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function NewListing() {
  const [title,         setTitle]         = useState("");
  const [propType,      setPropType]      = useState("Apartment");
  const [listingStatus, setListingStatus] = useState("Available");
  const [locationVals,  setLocationVals]  = useState(["Centre", "Yaoundé", "Bastos"]);
  const [price,         setPrice]         = useState("150,000");
  const [payFreq,       setPayFreq]       = useState("Monthly");
  const [bedrooms,      setBedrooms]      = useState(2);
  const [bathrooms,     setBathrooms]     = useState(1);
  const [toilets,       setToilets]       = useState(2);
  const [area,          setArea]          = useState("75");
  const [floor,         setFloor]         = useState("3");
  const [amenities,     setAmenities]     = useState<string[]>(["Wifi", "Electricity", "Water", "Gated"]);
  const [description,   setDescription]   = useState("");
  const [contact,       setContact]       = useState<string[]>(["Call", "WhatsApp"]);
  const [visitHours,    setVisitHours]    = useState("Weekends 10AM - 2PM");

  const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) =>
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  const setLoc = (i: number, val: string) =>
    setLocationVals((prev) => prev.map((v, idx) => (idx === i ? val : v)));

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      <div style={styles.page}>
        {/* ── Header ── */}
        <div style={styles.header}>
          <button style={styles.backBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={TEXT_DARK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span style={styles.headerTitle}>New Listing</span>
        </div>

        {/* ── 1. Basic Info ── */}
        <div style={styles.section}>
          <SectionHeader num="1" title="Basic Info" />

          <label style={styles.label}>Property Title</label>
          <input
            style={{ ...styles.input, marginBottom: 14 }}
            placeholder="e.g. Modern Studio in Bastos"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <label style={styles.label}>Property Type</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {propTypes.map((t) => (
              <TypeChip key={t.label} label={t.label} icon={t.icon}
                selected={propType === t.label} onClick={() => setPropType(t.label)} />
            ))}
          </div>

          <label style={styles.label}>Listing Status</label>
          <div style={styles.chipRow}>
            {(["Available", "Pending", "Unavailable"] as const).map((s) => (
              <Chip
                key={s} label={s}
                selected={listingStatus === s}
                color={s === "Available" ? GREEN : s === "Pending" ? "#F59E0B" : TEXT_MID}
                onClick={() => setListingStatus(s)}
              />
            ))}
          </div>
        </div>

        {/* ── 2. Location ── */}
        <div style={styles.section}>
          <SectionHeader num="2" title="Location" />

          <label style={styles.label}>Country</label>
          <div style={{ ...styles.input, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span>📍</span>
            <span style={{ fontSize: 14, color: TEXT_DARK }}>Cameroon</span>
          </div>

          {locationRows.map(({ label, opts }, i) => (
            <div key={label}>
              <label style={styles.label}>{label}</label>
              <div style={styles.selectWrap}>
                <select
                  style={{ ...styles.select, marginBottom: 12 }}
                  value={locationVals[i]}
                  onChange={(e) => setLoc(i, e.target.value)}
                >
                  {opts.map((o) => <option key={o}>{o}</option>)}
                </select>
                <span style={styles.selectArrow}>▼</span>
              </div>
            </div>
          ))}

          <button style={{
            width: "100%", padding: "12px", borderRadius: 12,
            border: `1.5px solid ${GRAY_BORDER}`, background: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 8, cursor: "pointer", fontFamily: "inherit",
          }}>
            <span>📍</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_MID }}>Pin on Map</span>
          </button>
        </div>

        {/* ── 3. Pricing ── */}
        <div style={styles.section}>
          <SectionHeader num="3" title="Pricing" />

          <label style={styles.label}>Price</label>
          <div style={{ position: "relative", marginBottom: 14 }}>
            <input
              style={{ ...styles.input, paddingRight: 52 }}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
            />
            <span style={{
              position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
              fontSize: 13, fontWeight: 700, color: PURPLE,
            }}>XAF</span>
          </div>

          <label style={styles.label}>Payment Frequency</label>
          <div style={styles.chipRow}>
            {["Monthly", "Yearly", "For Sale"].map((f) => (
              <Chip key={f} label={f} selected={payFreq === f} color={PURPLE} onClick={() => setPayFreq(f)} />
            ))}
          </div>
        </div>

        {/* ── 4. Property Details ── */}
        <div style={styles.section}>
          <SectionHeader num="4" title="Property Details" />

          {(
            [
              { label: "Bedrooms",  val: bedrooms,  set: setBedrooms },
              { label: "Bathrooms", val: bathrooms, set: setBathrooms },
              { label: "Toilets",   val: toilets,   set: setToilets },
            ] as { label: string; val: number; set: (n: number) => void }[]
          ).map(({ label, val, set }) => (
            <div key={label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 14, paddingBottom: 14,
              borderBottom: `1px solid ${GRAY_BORDER}`,
            }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: TEXT_DARK }}>{label}</span>
              <Stepper value={val} onChange={set} />
            </div>
          ))}

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Total Area</label>
              <div style={{ position: "relative" }}>
                <input
                  style={{ ...styles.input, paddingRight: 36 }}
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                />
                <span style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  fontSize: 12, color: TEXT_LIGHT,
                }}>m²</span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Floor Number</label>
              <input style={styles.input} value={floor} onChange={(e) => setFloor(e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── 5. Facilities & Amenities ── */}
        <div style={styles.section}>
          <SectionHeader num="5" title="Facilities & Amenities" />
          <div style={styles.chipRow}>
            {facilityList.map(({ label, icon }) => (
              <Chip
                key={label} label={label} icon={icon}
                selected={amenities.includes(label)}
                color={GREEN}
                onClick={() => toggle(amenities, setAmenities, label)}
              />
            ))}
          </div>
        </div>

        {/* ── 6. Media & Documents ── */}
        <div style={styles.section}>
          <SectionHeader num="6" title="Media & Documents" />
          {/* No max prop → unlimited uploads */}
          <MediaUploadBox label="Photos" />
          {/* Video walkthrough: still capped at 1 */}
          <MediaUploadBox label="Video Walkthrough" max={1} />
          {/* Floor plan: still capped at 1 */}
          <MediaUploadBox label="Floor Plan" max={1} />
          <DocUpload />
        </div>

        {/* ── 7. Description ── */}
        <div style={styles.section}>
          <SectionHeader num="7" title="Description" />
          <label style={styles.label}>Details</label>
          <textarea
            style={{ ...styles.input, minHeight: 110, resize: "vertical", lineHeight: 1.6 }}
            placeholder="A beautiful and well-lit studio located in the secure neighborhood of Bastos..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* ── 8. Contact & Availability ── */}
        <div style={styles.section}>
          <SectionHeader num="8" title="Contact & Availability" />

          <label style={styles.label}>Preferred Contact Method</label>
          <div style={styles.chipRow}>
            {(
              [
                { label: "Call",        icon: "📞" },
                { label: "WhatsApp",    icon: "💬" },
                { label: "In-app Chat", icon: "💭" },
              ] as { label: string; icon: string }[]
            ).map(({ label, icon }) => (
              <Chip
                key={label} label={label} icon={icon}
                selected={contact.includes(label)}
                color={GREEN}
                onClick={() => toggle(contact, setContact, label)}
              />
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={styles.label}>Available Visiting Hours</label>
            <input
              style={styles.input}
              placeholder="e.g. Weekends 10AM - 2PM"
              value={visitHours}
              onChange={(e) => setVisitHours(e.target.value)}
            />
          </div>
        </div>

        {/* ── Sticky action bar ──────────────────────────────────────────────────
            Positioned via `sticky` so it scrolls with the page until it hits
            the bottom offset, which is set to sit ABOVE the native tab bar.
        ── */}
        <div style={styles.bottomBar}>
          <button style={{
            flex: 1, padding: "14px", marginBottom: "30px",
            border: `1.5px solid ${PURPLE}`,
            borderRadius: 14, background: "#fff",
            color: PURPLE, fontWeight: 700, fontSize: 14,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            Save Draft
          </button>
          <button style={{
            flex: 2, padding: "14px", marginBottom: "30px",
            border: "none", borderRadius: 14,
            background: `linear-gradient(135deg, ${PURPLE}, #9F7AEA)`,
            color: "#fff", fontWeight: 700, fontSize: 14,
            cursor: "pointer", fontFamily: "inherit",
            boxShadow: "0 4px 14px rgba(124,92,252,0.35)",
          }}>
            Post Listing
          </button>
        </div>
      </div>
    </>
  );
}