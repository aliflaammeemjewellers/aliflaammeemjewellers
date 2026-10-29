/* ==========================================================================
   Appointment capture — appointment.html only.

   The booking form has always opened WhatsApp and a Gmail draft for the
   visitor. This module files the same request in Supabase on the way past, so
   it also lands in the admin panel.

   It is deliberately silent. The form is validated and submitted by script.js;
   this listens for the event it dispatches and never touches the form, the
   status message or the WhatsApp window. If the database is unreachable, or
   supabase/schema.sql has not been run yet, the console notes it and the
   visitor still leaves with their WhatsApp request — the booking is never lost.
   ========================================================================== */

import { createClient } from './vendor/supabase.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SETUP_HINT =
  'Appointments are not being saved. Run supabase/schema.sql in the Supabase ' +
  'SQL editor to create the appointments table.';

document.addEventListener('alm:appointment-submitted', (event) => {
  const d = event.detail || {};

  supabase
    .from('appointments')
    .insert({
      name: d.name || '',
      phone: d.phone || '',
      email: d.email || null,
      purpose: d.purposeLabel || d.purpose || '',
      preferred_date: d.preferredDate || null,
      preferred_time: d.preferredTime || null,
      notes: d.notes || null,
      source: 'website'
    })
    .then(({ error }) => {
      if (error) {
        // One line in the console, nothing on screen: the visitor's request has
        // already gone to WhatsApp, so there is nothing useful to tell them.
        console.warn('[alm] appointment not saved:', error.message, '\n' + SETUP_HINT);
      }
    });
});
