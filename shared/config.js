/* ============================================================================
   SPRINT — Ku ruhen të dhënat.

   Tri mundësi, dhe faqja është e njëjta te të tria:

   1. Bosh (si tani)  — gjithçka rri në shfletues. Mirë për ta provuar.
   2. Serveri lokal   — programi ngrihet mbi kompjuterin e dyqanit me
                        `node local/server.js`. Serveri e vendos vetë këtë,
                        ndaj këtu nuk preket asgjë.
   3. Supabase        — për përdorim online. Vendos URL-në dhe çelësin `anon`.
                        Ai çelës është publik nga natyra; çelësi `service_role`
                        nuk vihet KURRË këtu.
   ========================================================================== */
window.SPRINT_CONFIG = window.SPRINT_LOCAL
  ? { SUPABASE_URL: '', SUPABASE_ANON_KEY: 'local', PHOTO_BUCKET: 'photos', LOCAL: true }
  : {
      SUPABASE_URL: '',
      SUPABASE_ANON_KEY: '',
      PHOTO_BUCKET: 'photos',
    };
