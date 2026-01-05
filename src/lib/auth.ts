import { clerkClient } from '@clerk/astro/server';

/**
 * Get admin emails from environment
 */
export function getAdminEmails(): string[] {
  const emails = import.meta.env.ADMIN_EMAILS || '';
  return emails.split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
}

/**
 * Check if a user ID belongs to an admin
 */
export async function isUserAdmin(userId: string, context: any): Promise<boolean> {
  try {
    const client = clerkClient(context);
    const user = await client.users.getUser(userId);
    const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase() || '';
    const adminEmails = getAdminEmails();
    return adminEmails.includes(userEmail);
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized') {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}
