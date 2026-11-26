export const campaignImagePrefix = (scope: { companyId: string; projectId: string }) =>
  `soluciones-campaign/${encodeURIComponent(scope.companyId)}/${encodeURIComponent(scope.projectId)}/`;

export function belongsToCampaignImageScope(value: string, scope: { companyId: string; projectId: string }) {
  const url = new URL(value);
  if (!url.hostname.endsWith(".public.blob.vercel-storage.com") || !url.pathname.startsWith("/soluciones-campaign/")) return true;
  const prefix = "/" + campaignImagePrefix(scope);
  return url.pathname.startsWith(prefix) && /^[a-f0-9-]{36}\.webp$/.test(url.pathname.slice(prefix.length));
}
