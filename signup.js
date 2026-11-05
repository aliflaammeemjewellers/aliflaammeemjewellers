/* signup.html behaviour — moved out of the page so the CSP can forbid inline scripts. */
import { createClient } from "./vendor/supabase.js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const form = document.getElementById("signupForm");
const message = document.getElementById("signupMessage");
const submitButton = document.getElementById("signupButton");
const fullNameInput = document.getElementById("fullName");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

function showMessage(text, state) {
  message.textContent = text;
  message.dataset.state = state;
  message.hidden = !text;
}

function friendlyError(error) {
  const original = error && error.message ? error.message : "";
  const normalized = original.toLowerCase();
  if (normalized.includes("already registered") || normalized.includes("already exists")) {
    return "An account with this email address already exists. Sign in or reset your password instead.";
  }
  if (normalized.includes("password") && (normalized.includes("weak") || normalized.includes("least"))) {
    return "Please choose a stronger password that meets the account security requirements.";
  }
  if (normalized.includes("too many") || normalized.includes("rate limit")) {
    return "There have been too many attempts. Please wait a moment and try again.";
  }
  if (normalized.includes("failed to fetch") || normalized.includes("network")) {
    return "We couldn't reach the account service. Check your connection and try again.";
  }
  return original || "We couldn't create your account. Please check your details and try again.";
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("", "");

  const fullName = fullNameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const originalLabel = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = "Creating account…";

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (error) {
      showMessage(friendlyError(error), "error");
      return;
    }

    if (!data.user) {
      showMessage("We couldn't confirm your account was created. Please try again.", "error");
      return;
    }

    form.reset();
    if (data.session) {
      showMessage("Your account is ready. Taking you to Alif Laam Meem…", "success");
      window.setTimeout(() => window.location.replace("index.html"), 900);
    } else {
      showMessage("Your account has been created. Please check your email for a confirmation link before signing in.", "success");
    }
  } catch (error) {
    showMessage(friendlyError(error), "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalLabel;
  }
});

const googleButton = document.getElementById("googleButton");
googleButton.addEventListener("click", async () => {
  showMessage("", "");
  googleButton.disabled = true;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: new URL("index.html", window.location.href).href }
  });
  if (error) {
    showMessage(friendlyError(error), "error");
    googleButton.disabled = false;
  }
});

form?.addEventListener("input", () => showMessage("", ""));
