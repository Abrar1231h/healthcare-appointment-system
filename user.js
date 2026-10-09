// Check login
const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
if (!loggedInUser) {
    alert("Please Login First");
    window.location.href = "login.html";
}

document.getElementById("userId").innerText = loggedInUser.id;
document.getElementById("userName").innerText = loggedInUser.name;
document.getElementById("userEmail").innerText = loggedInUser.email;
document.getElementById("userPhone").innerText = loggedInUser.phone || "-";
document.getElementById("userRole").innerText = loggedInUser.role === "admin" ? "Admin" : "Patient";

function logout() {
    localStorage.removeItem("loggedInUser");
    window.location.href = "login.html";
}

const doctors = loadDoctors();
let appointments = loadAppointments();
let editingId = null;   // set while rescheduling

function doctorById(id) { return doctors.find(d => d.id === id); }
function myAppointments() { return appointments.filter(a => a.patientId === loggedInUser.id); }

// ---------- Reminders (today and tomorrow) ----------
function showReminders() {
    const box = document.getElementById("reminders");
    const today = todayStr(), tomorrow = tomorrowStr();
    const upcoming = myAppointments()
        .filter(a => isActive(a) && (a.date === today || a.date === tomorrow))
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    box.innerHTML = "";
    if (upcoming.length === 0) { box.hidden = true; return; }
    box.hidden = false;
    const h = document.createElement("strong");
    h.textContent = "Reminder: upcoming appointments";
    box.appendChild(h);
    upcoming.forEach(a => {
        const p = document.createElement("p");
        const d = doctorById(a.doctorId);
        p.textContent = (a.date === today ? "Today" : "Tomorrow") + " at " + formatTime(a.time) +
            " with " + (d ? d.name : "doctor") + " (" + a.type + ")";
        box.appendChild(p);
    });
}

// ---------- Booking form ----------
const doctorSelect = document.getElementById("doctorSelect");
const dateInput = document.getElementById("dateInput");
const timeSelect = document.getElementById("timeSelect");

function fillDoctors() {
    doctorSelect.innerHTML = '<option value="">Select doctor</option>';
    doctors.forEach(d => {
        const o = document.createElement("option");
        o.value = d.id;
        o.textContent = d.name + " - " + d.specialty + " (₹" + d.fee + ")";
        doctorSelect.appendChild(o);
    });
}

function fillTimes() {
    const doctorId = Number(doctorSelect.value);
    const date = dateInput.value;
    const keep = timeSelect.value;
    timeSelect.innerHTML = '<option value="">Select time</option>';
    if (!doctorId || !date) return;
    SLOTS.forEach(t => {
        const o = document.createElement("option");
        o.value = t;
        const taken = isSlotTaken(appointments, doctorId, date, t, editingId);
        const past = isPastSlot(date, t);
        o.textContent = formatTime(t) + (taken ? " (booked)" : "");
        o.disabled = taken || past;
        timeSelect.appendChild(o);
    });
    if (keep && !timeSelect.querySelector('option[value="' + keep + '"]:disabled')) timeSelect.value = keep;
}

dateInput.min = todayStr();
doctorSelect.addEventListener("change", fillTimes);
dateInput.addEventListener("change", fillTimes);

function resetBookingForm() {
    editingId = null;
    document.getElementById("bookForm").reset();
    document.getElementById("bookTitle").textContent = "Book an Appointment";
    document.getElementById("bookBtn").textContent = "Book Appointment";
    document.getElementById("cancelEditBtn").hidden = true;
    fillTimes();
}

document.getElementById("cancelEditBtn").addEventListener("click", resetBookingForm);

document.getElementById("bookForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const doctorId = Number(doctorSelect.value);
    const date = dateInput.value;
    const time = timeSelect.value;
    const type = document.getElementById("typeSelect").value;
    const reason = document.getElementById("reasonInput").value.trim();

    if (!doctorId || !date || !time) { alert("Select a doctor, date and time."); return; }
    if (date < todayStr() || isPastSlot(date, time)) { alert("Choose a future date and time."); return; }
    if (isSlotTaken(appointments, doctorId, date, time, editingId)) {
        alert("That slot was just booked. Please pick another time.");
        fillTimes();
        return;
    }

    if (editingId) {
        const a = appointments.find(x => x.id === editingId);
        Object.assign(a, { doctorId, date, time, type, reason, status: "Booked" });
        a.meetLink = type === "Virtual" ? "https://meet.jit.si/MediConnect-" + a.id : "";
        alert("Appointment rescheduled.");
    } else {
        const id = Date.now();
        appointments.push({
            id, patientId: loggedInUser.id, patientName: loggedInUser.name,
            doctorId, date, time, type, reason, status: "Booked", notes: "",
            meetLink: type === "Virtual" ? "https://meet.jit.si/MediConnect-" + id : ""
        });
        alert("Appointment booked.");
    }
    saveData("appointments", appointments);
    resetBookingForm();
    showAppointments();
    showReminders();
});

// ---------- My appointments ----------
function showAppointments() {
    const body = document.getElementById("appointmentList");
    body.innerHTML = "";
    const list = myAppointments().sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    if (list.length === 0) {
        body.innerHTML = '<tr><td colspan="7">No appointments yet. Book one above.</td></tr>';
        return;
    }
    list.forEach(a => {
        const tr = document.createElement("tr");
        const d = doctorById(a.doctorId);
        [d ? d.name : "(removed)", a.date, formatTime(a.time), a.type].forEach(v => {
            const td = document.createElement("td"); td.textContent = v; tr.appendChild(td);
        });
        const st = document.createElement("td");
        const b = document.createElement("span");
        b.className = "badge badge-" + a.status.toLowerCase();
        b.textContent = a.status;
        st.appendChild(b); tr.appendChild(st);

        const nt = document.createElement("td"); nt.textContent = a.notes || "-"; tr.appendChild(nt);

        const act = document.createElement("td");
        if (isActive(a)) {
            if (a.type === "Virtual") {
                const join = document.createElement("a");
                join.href = a.meetLink; join.target = "_blank"; join.rel = "noopener";
                join.className = "play-btn link-btn"; join.textContent = "Join call";
                act.appendChild(join);
            }
            const re = document.createElement("button");
            re.className = "play-btn"; re.textContent = "Reschedule";
            re.onclick = () => startReschedule(a);
            const ca = document.createElement("button");
            ca.className = "delete-btn"; ca.textContent = "Cancel";
            ca.onclick = () => cancelAppointment(a.id);
            act.appendChild(re); act.appendChild(ca);
        } else {
            act.textContent = "-";
        }
        tr.appendChild(act);
        body.appendChild(tr);
    });
}

function startReschedule(a) {
    editingId = a.id;
    doctorSelect.value = a.doctorId;
    dateInput.value = a.date;
    fillTimes();
    timeSelect.value = a.time;
    document.getElementById("typeSelect").value = a.type;
    document.getElementById("reasonInput").value = a.reason || "";
    document.getElementById("bookTitle").textContent = "Reschedule Appointment";
    document.getElementById("bookBtn").textContent = "Save new time";
    document.getElementById("cancelEditBtn").hidden = false;
    document.getElementById("bookTitle").scrollIntoView({ behavior: "smooth" });
}

function cancelAppointment(id) {
    if (!confirm("Cancel this appointment?")) return;
    appointments.find(a => a.id === id).status = "Cancelled";
    saveData("appointments", appointments);
    if (editingId === id) resetBookingForm();
    showAppointments();
    showReminders();
}

// ---------- Medical record ----------
const records = loadRecords();
const myRecord = records[loggedInUser.id] || {};
document.getElementById("bloodGroup").value = myRecord.bloodGroup || "";
document.getElementById("allergies").value = myRecord.allergies || "";
document.getElementById("conditions").value = myRecord.conditions || "";

document.getElementById("recordForm").addEventListener("submit", function (e) {
    e.preventDefault();
    records[loggedInUser.id] = {
        bloodGroup: document.getElementById("bloodGroup").value,
        allergies: document.getElementById("allergies").value.trim(),
        conditions: document.getElementById("conditions").value.trim()
    };
    saveData("records", records);
    alert("Medical record saved.");
});

// ---------- Doctors list ----------
function showDoctors(filter) {
    const body = document.getElementById("doctorList");
    body.innerHTML = "";
    const q = filter.toLowerCase();
    const matches = doctors.filter(d => (d.name + " " + d.specialty).toLowerCase().includes(q));
    if (matches.length === 0) {
        body.innerHTML = '<tr><td colspan="5">No doctors found.</td></tr>';
        return;
    }
    matches.forEach(d => {
        const tr = document.createElement("tr");
        const td0 = document.createElement("td");
        const btn = document.createElement("button");
        btn.className = "play-btn"; btn.textContent = "Book";
        btn.onclick = () => {
            doctorSelect.value = d.id; fillTimes();
            document.getElementById("bookTitle").scrollIntoView({ behavior: "smooth" });
        };
        td0.appendChild(btn); tr.appendChild(td0);
        [d.name, d.specialty, d.experience + " yrs", "₹" + d.fee].forEach(v => {
            const td = document.createElement("td"); td.textContent = v; tr.appendChild(td);
        });
        body.appendChild(tr);
    });
}
document.getElementById("searchBox").addEventListener("input", e => showDoctors(e.target.value));

fillDoctors();
fillTimes();
showDoctors("");
showAppointments();
showReminders();
