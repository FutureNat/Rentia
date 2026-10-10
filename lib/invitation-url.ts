export function rentiaInvitationUrl(publicOrigin:string,organizationId:string) {
  const origin=new URL(publicOrigin);
  if (origin.protocol!=='https:'&&!(origin.protocol==='http:'&&['localhost','127.0.0.1'].includes(origin.hostname))) throw new Error('El origen público de Rentia no es válido');
  const url=new URL('/invitacion',origin.origin);
  url.searchParams.set('organization_id',organizationId);
  return url.toString();
}
