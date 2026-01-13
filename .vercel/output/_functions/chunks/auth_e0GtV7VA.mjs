import { b as clerkClient } from "./index_BFbHgZwU.mjs";
function getAdminEmails() {
  const emails = "frxnco@protonmail.com,ferreirafranco98@gmail.com";
  return emails.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}
async function isUserAdmin(userId, context) {
  try {
    const client = clerkClient(context);
    const user = await client.users.getUser(userId);
    const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase() || "";
    const adminEmails = getAdminEmails();
    return adminEmails.includes(userEmail);
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}
function unauthorizedResponse(message = "Unauthorized") {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { "Content-Type": "application/json" }
  });
}
export {
  isUserAdmin as i,
  unauthorizedResponse as u
};
