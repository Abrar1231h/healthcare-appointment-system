// Users come from signup.html (localStorage). Replace with a backend API later.
const loggedIn = JSON.parse(localStorage.getItem("loggedInUser"));
if (!loggedIn || loggedIn.role !== "admin") {
    alert("Admin access only. Please login.");
    window.location.href = "login.html";
}

const users = JSON.parse(localStorage.getItem("users")) || [];
const records = loadRecords();
let doctors = loadDoctors();
let appointments = loadAppointments();

// values can be text or DOM nodes; actions is a list of {label, cls, fn}
function addRow(body, values, actions) {
    const tr = document.createElement("tr");
    values.forEach(v => {
        const td = document.createElement("td");
        if (v instanceof Node) td.appendChild(v); else td.textContent = v;
        tr.appendChild(td);
    });
    if (actions) {
        const td = document.createElement("td");
        actions.forEach(a => {
            const btn = document.createElement("button");
            btn.textContent = a.label;
            btn.className = a.cls || "delete-btn";
            btn.onclick = a.fn;
            td.appendChild(btn);
        });
        tr.appendChild(td);
    }
    body.appendChild(tr);
}

function badge(status) {
    const s = document.createElement("span");
    s.className = "badge badge-" + status.toLowerCase();
    s.textContent = status;
    return s;
}

function doctorName(id) {
    const d = doctors.find(x => x.id === id);
    return d ? d.name : "(removed)";
}

function render() {
    const today = todayStr();
    document.getElementById("totalPatients").textContent = users.filter(u => u.role === "user").length;
    document.getElementById("totalDoctors").textContent = doctors.length;
    document.getElementById("totalAppointments").textContent = appointments.length;
    document.getElementById("todayAppointments").textContent =
        appointments.filter(a => a.date === today && isActive(a)).length;

    // Today's schedule: helps clinic balance doctor workload
    const sc = document.getElementById("scheduleBody"); sc.innerHTML = "";
    doctors.forEach(d => {
        const booked = appointments.filter(a => a.doctorId === d.id && a.date === today && isActive(a)).length;
        const pct = Math.round(booked / SLOTS.length * 100);
        addRow(sc, [d.name, d.specialty, booked, SLOTS.length - booked, pct + "%"]);
    });

    // Appointments with filters
    const fd = document.getElementById("filterDate").value;
    const fs = document.getElementById("filterStatus").value;
    const ab = document.getElementById("appointmentBody"); ab.innerHTML = "";
    const list = appointments
        .filter(a => (!fd || a.date === fd) && (!fs || a.status === fs))
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    if (list.length === 0) {
        ab.innerHTML = '<tr><td colspan="8">No appointments found.</td></tr>';
    }
    list.forEach(a => {
        const actions = [];
        if (a.status === "Booked")
            actions.push({ label: "Confirm", cls: "play-btn", fn: () => setStatus(a.id, "Confirmed") });
        if (isActive(a)) {
            actions.push({ label: "Complete", cls: "play-btn", fn: () => completeAppointment(a.id) });
            actions.push({ label: "Cancel", cls: "delete-btn", fn: () => setStatus(a.id, "Cancelled") });
        }
        addRow(ab, [a.id, a.patientName, doctorName(a.doctorId), a.date, formatTime(a.time), a.type, badge(a.status)],
               actions.length ? actions : [{ label: "Delete", cls: "delete-btn", fn: () => deleteAppointment(a.id) }]);
    });

    const db = document.getElementById("doctorBody"); db.innerHTML = "";
    doctors.forEach(d => addRow(db, [d.id, d.name, d.specialty, d.experience + " yrs", "₹" + d.fee],
        [{ label: "Delete", cls: "delete-btn", fn: () => deleteDoctor(d.id) }]));

    const ub = document.getElementById("userBody"); ub.innerHTML = "";
    users.forEach(u => {
        const r = records[u.id] || {};
        addRow(ub, [u.id, u.name, u.email, u.phone || "-", u.role === "admin" ? "Admin" : "Patient",
                    r.bloodGroup || "-", r.allergies || "-"]);
    });
}

function setStatus(id, status) {
    if (status === "Cancelled" && !confirm("Cancel this appointment?")) return;
    const a = appointments.find(x => x.id === id);
    a.status = status;
    saveData("appointments", appointments);
    render();
}

function completeAppointment(id) {
    const notes = prompt("Consultation notes / prescription (optional):", "");
    if (notes === null) return;
    const a = appointments.find(x => x.id === id);
    a.status = "Completed";
    a.notes = notes.trim();
    saveData("appointments", appointments);
    render();
}

function deleteAppointment(id) {
    if (!confirm("Delete this appointment record?")) return;
    appointments = appointments.filter(a => a.id !== id);
    saveData("appointments", appointments);
    render();
}

function deleteDoctor(id) {
    if (!confirm("Delete this doctor? Their active appointments will be cancelled.")) return;
    doctors = doctors.filter(d => d.id !== id);
    appointments.forEach(a => { if (a.doctorId === id && isActive(a)) a.status = "Cancelled"; });
    saveData("doctors", doctors);
    saveData("appointments", appointments);
    render();
}

document.getElementById("doctorForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const name = document.getElementById("doctorName").value.trim();
    const specialty = document.getElementById("doctorSpecialty").value.trim();
    const experience = Number(document.getElementById("doctorExperience").value);
    const fee = Number(document.getElementById("doctorFee").value);
    if (!name || !specialty || !(experience >= 0) || !(fee > 0)) {
        alert("Fill all doctor fields. Fee must be greater than 0.");
        return;
    }
    doctors.push({ id: Date.now(), name, specialty, experience, fee });
    saveData("doctors", doctors);
    this.reset();
    render();
});

document.getElementById("filterDate").addEventListener("change", render);
document.getElementById("filterStatus").addEventListener("change", render);
document.getElementById("clearFilters").addEventListener("click", () => {
    document.getElementById("filterDate").value = "";
    document.getElementById("filterStatus").value = "";
    render();
});

function logout() {
    localStorage.removeItem("loggedInUser");
    window.location.href = "login.html";
}

render();
