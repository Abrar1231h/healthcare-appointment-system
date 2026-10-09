const signupForm = document.getElementById("signupForm");

signupForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const role = document.getElementById("role").value;

    if (name.length < 3) { alert("Name must contain at least 3 characters"); return; }
    if (!/^\d{10}$/.test(phone)) { alert("Phone number must be 10 digits"); return; }
    if (password.length < 6) { alert("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { alert("Passwords do not match"); return; }
    if (role === "") { alert("Please select a role"); return; }

    const users = JSON.parse(localStorage.getItem("users")) || [];
    if (users.find(u => u.email === email)) { alert("Email already registered"); return; }

    users.push({ id: Date.now(), name, email, phone, password, role });
    localStorage.setItem("users", JSON.stringify(users));

    alert("Registration Successful");
    window.location.href = "login.html";
});
