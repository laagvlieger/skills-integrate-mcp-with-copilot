document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const registerForm = document.getElementById("register-form");
  const loginForm = document.getElementById("login-form");
  const logoutButton = document.getElementById("logout-btn");
  const authStatus = document.getElementById("auth-status");
  const AUTH_STORAGE_KEY = "authToken";
  const AUTH_EMAIL_KEY = "authEmail";

  function getAuthToken() {
    return localStorage.getItem(AUTH_STORAGE_KEY);
  }

  function getCurrentUserEmail() {
    return localStorage.getItem(AUTH_EMAIL_KEY);
  }

  function setAuthState(token, email) {
    localStorage.setItem(AUTH_STORAGE_KEY, token);
    localStorage.setItem(AUTH_EMAIL_KEY, email);
    renderAuthState();
  }

  function clearAuthState() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_EMAIL_KEY);
    renderAuthState();
  }

  function renderAuthState() {
    const userEmail = getCurrentUserEmail();
    if (userEmail) {
      authStatus.textContent = `Logged in as ${userEmail}`;
      authStatus.className = "success";
      logoutButton.classList.remove("hidden");
    } else {
      authStatus.textContent = "Not logged in";
      authStatus.className = "";
      logoutButton.classList.add("hidden");
    }
    authStatus.classList.remove("hidden");
  }

  function setMessage(message, isError = false) {
    messageDiv.textContent = message;
    messageDiv.className = isError ? "error" : "success";
    messageDiv.classList.remove("hidden");
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        const currentUserEmail = getCurrentUserEmail();

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        currentUserEmail && currentUserEmail === email
                          ? `<button class="delete-btn" data-activity="${name}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const token = getAuthToken();

    if (!token) {
      setMessage("Please log in first", true);
      return;
    }

    try {
      const response = await fetch(`/activities/${encodeURIComponent(activity)}/unregister`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(result.message, false);

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        setMessage(result.detail || "An error occurred", true);
      }
    } catch (error) {
      setMessage("Failed to unregister. Please try again.", true);
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const activity = document.getElementById("activity").value;
    const token = getAuthToken();

    if (!token) {
      setMessage("Please log in first", true);
      return;
    }

    try {
      const response = await fetch(`/activities/${encodeURIComponent(activity)}/signup`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(result.message, false);
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        setMessage(result.detail || "An error occurred", true);
      }
    } catch (error) {
      setMessage("Failed to sign up. Please try again.", true);
      console.error("Error signing up:", error);
    }
  });

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;

    try {
      const response = await fetch("/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(result.message || "Registration successful", false);
        registerForm.reset();
      } else {
        setMessage(result.detail || "Registration failed", true);
      }
    } catch (error) {
      setMessage("Failed to register. Please try again.", true);
      console.error("Error registering:", error);
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (response.ok) {
        setAuthState(result.access_token, email);
        setMessage("Logged in successfully", false);
        loginForm.reset();
        fetchActivities();
      } else {
        setMessage(result.detail || "Login failed", true);
      }
    } catch (error) {
      setMessage("Failed to log in. Please try again.", true);
      console.error("Error logging in:", error);
    }
  });

  logoutButton.addEventListener("click", () => {
    clearAuthState();
    setMessage("Logged out", false);
    fetchActivities();
  });

  // Initialize app
  renderAuthState();
  fetchActivities();
});
