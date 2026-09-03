const url = process.env.LEADCHASERS_LOGIN_URL || "http://127.0.0.1:3001/login";
const email = "elhamdanisaad@leadchasers.ma";
const password = process.env.LEADCHASERS_FOUNDER_INITIAL_PASSWORD;

if (!password) throw new Error("Missing founder test password.");

const getResponse = await fetch(url);
const html = await getResponse.text();
const form = html.match(/<form[^>]*class="login-form-card"[\s\S]*?<\/form>/)?.[0];

if (!form) throw new Error("Login form not found.");

const decodeHtml = (value) => value
  .replaceAll("&quot;", '"')
  .replaceAll("&#x27;", "'")
  .replaceAll("&amp;", "&")
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">");

const formData = new FormData();
for (const tag of form.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
  const name = tag[0].match(/name="([^"]+)"/)?.[1];
  const value = tag[0].match(/value="([^"]*)"/)?.[1] ?? "";
  if (name) formData.append(decodeHtml(name), decodeHtml(value));
}

formData.append("email", email);
formData.append("password", password);

const postResponse = await fetch(url, {
  method: "POST",
  body: formData,
  redirect: "manual",
  headers: { origin: new URL(url).origin },
});
const responseText = await postResponse.text();
const setCookies = postResponse.headers.getSetCookie?.() ?? [];
const sessionCookies = setCookies.filter((value) => value.includes("auth-token"));

const result = {
  status: postResponse.status,
  location: postResponse.headers.get("location"),
  setsSessionCookie: sessionCookies.length > 0,
  sessionCookiesHttpOnly: sessionCookies.length > 0 && sessionCookies.every((value) => /;\s*HttpOnly/i.test(value)),
  sessionCookiesSameSiteLax: sessionCookies.length > 0 && sessionCookies.every((value) => /;\s*SameSite=Lax/i.test(value)),
  routesToPasswordUpdate: responseText.includes("/update-password"),
  containsCredentialError: responseText.includes("Identifiants incorrects"),
  containsRateLimitError: responseText.includes("Trop de tentatives"),
  containsConfigurationError: responseText.includes("n'est pas configur"),
  containsDatabaseError: responseText.includes("base de donn"),
};

console.log(JSON.stringify(result));

const reachesPasswordUpdate = result.location === "/update-password" || result.routesToPasswordUpdate;

if (
  !result.setsSessionCookie
  || !result.sessionCookiesHttpOnly
  || !result.sessionCookiesSameSiteLax
  || !reachesPasswordUpdate
  || result.containsCredentialError
) {
  process.exitCode = 1;
}
