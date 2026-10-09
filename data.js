// Shared storage (localStorage). Replace with backend API calls later.
const DEFAULT_DOCTORS = [
    { id: 1, name: "Dr. Ananya Rao",   specialty: "General Physician", experience: 12, fee: 500 },
    { id: 2, name: "Dr. Rohit Sharma", specialty: "Cardiologist",      experience: 15, fee: 900 },
    { id: 3, name: "Dr. Meera Nair",   specialty: "Dermatologist",     experience: 8,  fee: 700 },
    { id: 4, name: "Dr. Sanjay Patel", specialty: "Pediatrician",      experience: 10, fee: 600 }
];

// Clinic hours 09:00 - 17:00, 30-minute slots, lunch break 13:00 - 14:00
const SLOTS = [];
for (let h = 9; h < 17; h++) {
    if (h === 13) continue;
    SLOTS.push(String(h).padStart(2, "0") + ":00");
    SLOTS.push(String(h).padStart(2, "0") + ":30");
}

function loadData(key, defaults) {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved) return saved;
    localStorage.setItem(key, JSON.stringify(defaults));
    return defaults;
}
function saveData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function loadDoctors()      { return loadData("doctors", DEFAULT_DOCTORS); }
function loadAppointments() { return loadData("appointments", []); }
function loadRecords()      { return loadData("records", {}); }   // { patientId: {bloodGroup, allergies, conditions} }

function todayStr() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function tomorrowStr() {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function formatTime(t) {
    const [h, m] = t.split(":").map(Number);
    return ((h % 12) || 12) + ":" + String(m).padStart(2, "0") + (h >= 12 ? " PM" : " AM");
}
function isActive(a) { return a.status === "Booked" || a.status === "Confirmed"; }

// A slot is taken if the doctor already has an active appointment at that date and time
function isSlotTaken(appts, doctorId, date, time, excludeId) {
    return appts.some(a => a.doctorId === doctorId && a.date === date && a.time === time &&
                           isActive(a) && a.id !== excludeId);
}
// Slot already passed (only matters for today)
function isPastSlot(date, time) {
    if (date !== todayStr()) return false;
    const now = new Date();
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m <= now.getHours() * 60 + now.getMinutes();
}
