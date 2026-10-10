import { auth, clerkClient } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createAppSession, deleteAppSession, getAccount, getSessionUser, getStoreIdentityByAccount, getStoreIdentityByOrganization, getStoreIdentityByOwner } from '../db/database';

const COOKIE_NAME = 'rentia_session';
const SESSION_SECONDS = 60 * 60 * 24 * 30;

async function hashToken(token:string) {
  const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}

function createToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
}

export type RentiaUser = {
  id:string;
  email:string;
  name:string;
  role:'owner'|'admin'|'member';
  clerkUserId:string|null;
  organizationId:string|null;
  ownerClerkUserId:string|null;
  authProvider:'clerk'|'legacy';
};

export async function getRentiaUser():Promise<RentiaUser|null> {
  try {
    const clerkAuth=await auth();
    if (clerkAuth.userId) {
      const link=clerkAuth.orgId
        ? await getStoreIdentityByOrganization(clerkAuth.orgId)
        : await getStoreIdentityByOwner(clerkAuth.userId);
      if (link) {
        // Read the current membership, not an old JWT role, so removals and
        // downgrades take effect on the next request (including direct API calls).
        let role:RentiaUser['role']='owner';
        if(link.owner_clerk_user_id!==clerkAuth.userId) {
          const client=await clerkClient();
          const memberships=await client.organizations.getOrganizationMembershipList({organizationId:link.clerk_organization_id,userId:[clerkAuth.userId],limit:1});
          const membership=memberships.data[0];
          if(!membership) return null;
          role=membership.role==='org:admin'?'admin':'member';
        }
        const account=await getAccount(link.store_user_id);
        if (account) return {
          id:account.user_id,
          email:account.email,
          name:account.owner_name,
          role,
          clerkUserId:clerkAuth.userId,
          organizationId:link.clerk_organization_id,
          ownerClerkUserId:link.owner_clerk_user_id,
          authProvider:'clerk',
        };
      }
      return null;
    }
  } catch {
    // Keep the existing cookie session available during the migration window.
  }
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (token) {
    const session = await getSessionUser(await hashToken(token));
    if (session) {
      // Revocation must not be bypassed by an old migration cookie.
      // Accounts not yet linked to Clerk retain their legacy sign-in path.
      if (await getStoreIdentityByAccount(session.user_id)) return null;
      const account = await getAccount(session.user_id);
      if (account) return {id:account.user_id,email:account.email,name:account.owner_name,role:'owner',clerkUserId:null,organizationId:null,ownerClerkUserId:null,authProvider:'legacy'};
    }
  }
  return null;
}

export function canManageRentia(user:RentiaUser) {
  return user.role==='owner'||user.role==='admin';
}

export async function createRentiaSession(userId:string) {
  const token = createToken();
  const expires = new Date(Date.now()+SESSION_SECONDS*1000);
  await createAppSession(userId,await hashToken(token),expires.toISOString());
  return token;
}

export function applySessionCookie(response:NextResponse, token:string) {
  response.cookies.set(COOKIE_NAME,token,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:SESSION_SECONDS});
  return response;
}

export async function clearRentiaSession(response:NextResponse) {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (token) await deleteAppSession(await hashToken(token));
  response.cookies.set(COOKIE_NAME,'',{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:0});
  return response;
}
