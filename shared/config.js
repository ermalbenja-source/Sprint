/* ============================================================================
   SPRINT — Lidhja me Supabase
   ----------------------------------------------------------------------------
   Plotëso këto dy vlera pasi të krijosh projektin falas në supabase.com:
     Supabase → Project Settings → Data API → Project URL dhe anon public key

   Çelësi «anon» është i sigurt të jetë publik: ai lejon VETËM leximin e menusë.
   Shkrimi kërkon hyrje me email e fjalëkalim (shih supabase/schema.sql).

   Nëse i lë bosh, faqja punon njësoj por me menunë e ngurtë nga shared/data.js
   dhe paneli admin ruan vetëm në këtë pajisje.
   ========================================================================== */
window.SPRINT_CONFIG = {
  SUPABASE_URL: '',       // p.sh. 'https://abcdefgh.supabase.co'
  SUPABASE_ANON_KEY: '',  // çelësi publik «anon»
  PHOTO_BUCKET: 'photos',
};
