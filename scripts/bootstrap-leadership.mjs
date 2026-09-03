import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY (legacy SUPABASE_SERVICE_ROLE_KEY is also supported).");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const cooperativeName = process.env.LEADCHASERS_COOPERATIVE_NAME || "LeadChasers Media Coop";

const people = [
  {
    key: "FOUNDER",
    email: "elhamdanisaad@leadchasers.ma",
    firstName: "Saad",
    lastName: "El Hamdani",
    position: "Founder & Chief Executive Officer",
    occupation: "Founder / Administrator",
    role: "ceo",
    department: "Management",
    isFounder: true,
  },
  {
    key: "CFO",
    email: "elhamdaniyassir@leadchasers.ma",
    firstName: "Yassir",
    lastName: "El Hamdani",
    position: "Chief Financial Officer",
    occupation: "Finance & Administration",
    role: "cfo",
    department: "Finance",
    isFounder: false,
  },
  {
    key: "CCO",
    email: "lamraniabdelmonaim@leadchasers.ma",
    firstName: "Abdelmonaim",
    lastName: "Lamrani",
    position: "Chief Coordination Officer",
    occupation: "Coordination & Operations",
    role: "cco",
    department: "Operations",
    isFounder: false,
  },
];

function temporaryPassword() {
  return `Lc!${randomBytes(18).toString("base64url")}9aA`;
}

async function requiredRow(table, column, value, fields = "id") {
  const { data, error } = await supabase.from(table).select(fields).eq(column, value).limit(1).maybeSingle();
  if (error || !data) throw new Error(`Missing ${table}.${column}=${value}. Apply all migrations first.`);
  return data;
}

async function findAuthUser(email) {
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
    if (user) return user;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

let cooperative = await requiredRow("cooperatives", "name", cooperativeName).catch(() => null);
if (!cooperative) {
  const { data, error } = await supabase.from("cooperatives").insert({ name: cooperativeName }).select("id").single();
  if (error || !data) throw new Error(`Could not create cooperative: ${error?.message ?? "unknown error"}`);
  cooperative = data;
}

const credentials = [];
for (const person of people) {
  const role = await requiredRow("roles", "slug", person.role);
  const department = await requiredRow("departments", "name", person.department);
  let authUser = await findAuthUser(person.email);

  if (!authUser) {
    const envPassword = process.env[`LEADCHASERS_${person.key}_INITIAL_PASSWORD`];
    const password = envPassword || temporaryPassword();
    const { data, error } = await supabase.auth.admin.createUser({
      email: person.email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: `${person.firstName} ${person.lastName}`,
        must_change_password: true,
      },
    });
    if (error || !data.user) throw new Error(`Could not create ${person.email}: ${error?.message ?? "unknown error"}`);
    authUser = data.user;
    credentials.push({ email: person.email, password });
  }

  const { error: memberError } = await supabase.from("members").upsert({
    cooperative_id: cooperative.id,
    user_id: authUser.id,
    first_name: person.firstName,
    last_name: person.lastName,
    email: person.email,
    occupation: person.occupation,
    cooperative_position: person.position,
    department_id: department.id,
    role_id: role.id,
    status: "active",
    is_founder: person.isFounder,
  }, { onConflict: "cooperative_id,user_id" });
  if (memberError) throw new Error(`Could not provision ${person.email}: ${memberError.message}`);
}

console.log(`Leadership provisioning complete for ${cooperativeName}.`);
if (credentials.length) {
  console.log("One-time temporary credentials (store securely; each user must change the password at first login):");
  for (const credential of credentials) console.log(`${credential.email}: ${credential.password}`);
} else {
  console.log("All leadership accounts already existed; no passwords were changed.");
}
