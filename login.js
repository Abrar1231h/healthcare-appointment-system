// Demo login using localStorage. Replace with a fetch() call to your backend.
// Demo admin: admin@example.com / admin123
const USER_HOME_PAGE = "user.html";
const ADMIN_PAGE = "admin.html";

const form = document.getElementById("loginForm");
const message = document.getElementById("message");

form.addEventListener("submit", function (e) {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
        message.textContent = "Enter your email and password.";
        return;
    }

    const accounts = [{ id: 1, name: "Admin", email: "admin@example.com", phone: "-", password: "admin123", role: "admin" }]
        .concat(JSON.parse(localStorage.getItem("users") || "[]"));

    const user = accounts.find(u => u.email === email && u.password === password);
    if (!user) {
        message.textContent = "Incorrect email or password.";
        return;
    }

    localStorage.setItem("loggedInUser", JSON.stringify({
        id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role
    }));
    window.location.href = user.role === "admin" ? ADMIN_PAGE : USER_HOME_PAGE;
});
