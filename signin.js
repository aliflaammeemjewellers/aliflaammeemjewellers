/* signin.html behaviour — moved out of the page so the CSP can forbid inline scripts. */
import { createClient } from "./vendor/supabase.js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const form = document.getElementById("signupForm");
const message = document.getElementById("signupMessage");
const submitButton = document.getElementById("signupButton");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const googleButton = document.getElementById("googleButton");
const home = new URL("index.html", window.location.href).href;

function showMessage(text, state) {
  message.textContent = text;
  message.dataset.state = state;
  message.hidden = !text;
}

function friendlyError(error) {
  const original = error && error.message ? error.message : "";
  const n = original.toLowerCase();
  if (n.includes("invalid login")) return "That email and password don't match an account.";
  if (n.includes("not confirmed")) return "Please confirm your email first. Check your inbox for the link.";
  if (n.includes("too many") || n.includes("rate limit")) return "Too many attempts. Please wait a moment and try again.";
  if (n.includes("failed to fetch") || n.includes("network")) return "We couldn't reach the account service. Check your connection and try again.";
  return original || "We couldn't sign you in. Please try again.";
}

supabase.auth.getSession().then(({ data }) => {
  if (data.session) showMessage("You're already signed in. Taking you home…", "success"), setTimeout(() => location.replace("index.html"), 900);
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("", "");
  const label = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = "Signing in…";
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: emailInput.value.trim(),
      password: passwordInput.value
    });
    if (error) { showMessage(friendlyError(error), "error"); return; }
    showMessage("Signed in. Taking you to Alif Laam Meem…", "success");
    setTimeout(() => location.replace("index.html"), 700);
  } catch (error) {
    showMessage(friendlyError(error), "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = label;
  }
});

googleButton.addEventListener("click", async () => {
  showMessage("", "");
  googleButton.disabled = true;
  const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: home } });
  if (error) { showMessage(friendlyError(error), "error"); googleButton.disabled = false; }
});

document.getElementById("forgotLink")?.addEventListener("click", async (event) => {
  event.preventDefault();
  const email = emailInput.value.trim();
  if (!email) { showMessage("Enter your email address above, then tap Forgot your password again.", "error"); emailInput.focus(); return; }
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: home });
  showMessage(error ? friendlyError(error) : "If that email has an account, a reset link is on its way.", error ? "error" : "success");
});

form?.addEventListener("input", () => showMessage("", ""));
