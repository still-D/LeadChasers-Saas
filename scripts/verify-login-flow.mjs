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

const result = {
  status: postResponse.status,
  location: postResponse.headers.get("location"),
  setsSessionCookie: (postResponse.headers.getSetCookie?.() ?? [])
    .some((value) => value.includes("auth-token")),
  routesToPasswordUpdate: responseText.includes("/update-password"),
  containsCredentialError: responseText.includes("Identifiants incorrects"),
};

console.log(JSON.stringify(result));

if (!result.setsSessionCookie || !result.routesToPasswordUpdate || result.containsCredentialError) {
  process.exitCode = 1;
}
