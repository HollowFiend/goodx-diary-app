// public/js/dashboard.js
import { gxFetch } from './api.js';

/* ---------------- helpers ---------------- */
const $   = sel => document.querySelector(sel);
// encodeURIComponent(JSON.stringify(x)) – convenient one-liner
const enc = x => encodeURIComponent(JSON.stringify(x));

/* ---------------- DOM ---------------- */
const diaryTitle   = $('#diaryTitle');
const bookingsBody = $('#bookings tbody');
const createForm   = $('#createForm');
const patientSel   = $('#patientSelect');
const timeInput    = $('#time');
const durInput     = $('#duration');
const reasonInput  = $('#reason');

/* ---------------- state ---------------- */
const today = new Date().toISOString().split('T')[0];   // YYYY-MM-DD
let diaryUid, entityUid, bookingTypeUid, bookingStatusUid;

/* ------------------------------------------------------------------ */
/*   1️⃣  boot-strap: diary  →  booking-type  →  patients  →  list     */
/* ------------------------------------------------------------------ */
(async function boot () {
  try {
    /* 1. diaries -------------------------------------------------- */
    const diaries = await gxFetch(`/diary?fields=${enc(['uid','entity_uid','name'])}`);
    if (!diaries.data?.length) {
      diaryTitle.textContent = 'No diaries for this user';
      return;
    }
    const diary = diaries.data[0];                 // ← first diary for now
    diaryUid  = diary.uid;
    entityUid = diary.entity_uid;
    diaryTitle.textContent = diary.name;

    /* 2. booking types ------------------------------------------- */
    const typeFields = enc(['uid','name','booking_status_uid']);
    const typeFilter = enc(['AND',
      ['=', ['I','entity_uid'], ['L', entityUid]],
      ['=', ['I','diary_uid' ], ['L', diaryUid ]]
    ]);
    const types = await gxFetch(`/booking_type?fields=${typeFields}&filter=${typeFilter}`);

    // pick the “Consultation” type if it exists, else just first result
    const consult = types.data.find(t => t.name?.toLowerCase() === 'consultation') ?? types.data[0];
    bookingTypeUid   = consult.uid;
    bookingStatusUid = consult.booking_status_uid;

    /* 3. patients ------------------------------------------------- */
    const patFields = enc(['uid','name','surname']);
    const patFilter = enc(['=', ['I','entity_uid'], ['L', entityUid]]);
    const patients  = await gxFetch(`/patient?fields=${patFields}&filter=${patFilter}&limit=100`);

    patientSel.innerHTML = patients.data
      .map(p => `<option value="${p.uid}">${p.surname} ${p.name}</option>`)
      .join('');

    /* 4. first render -------------------------------------------- */
    await loadBookings();
  } catch (err) {
    console.error('Boot-strap failed:', err);
    diaryTitle.textContent = 'Error loading data';
  }
})();

/* ------------------------------------------------------------------ */
/*   List bookings for *today*                                        */
/* ------------------------------------------------------------------ */
async function loadBookings () {
  const bookFields = enc([
    ['AS', ['I','patient_uid','surname'], 'patient_surname'],
    ['AS', ['I','patient_uid','name'   ], 'patient_name'   ],
    'uid','start_time','duration','reason','cancelled'
  ]);

  const bookFilter = enc(['AND',
    ['=',  ['I','diary_uid'], ['L', diaryUid]],
    ['=',  ['::', ['I','start_time'], ['I','date']], ['L', today]],
    ['NOT',['I','cancelled']]
  ]);

  const res = await gxFetch(`/booking?fields=${bookFields}&filter=${bookFilter}`);

  bookingsBody.innerHTML = res.data.map(b => {
    const hhmm = b.start_time.split('T')[1].slice(0,5);
    return `
      <tr data-id="${b.uid}" data-duration="${b.duration}">
        <td>${hhmm}</td>
        <td>${b.patient_surname ?? ''} ${b.patient_name ?? ''}</td>
        <td>${b.reason ?? ''}</td>
        <td>
          <button class="edit" title="Edit">✎</button>
          <button class="del"  title="Delete">🗑</button>
        </td>
      </tr>`;
  }).join('');
}

/* ------------------------------------------------------------------ */
/*   Create                                                           */
/* ------------------------------------------------------------------ */
createForm.addEventListener('submit', async e => {
  e.preventDefault();

  const body = {
    model: {
      entity_uid       : entityUid,
      diary_uid        : diaryUid,
      booking_type_uid : bookingTypeUid,
      booking_status_uid,
      start_time : `${today}T${timeInput.value}:00`,
      duration   : +durInput.value,
      patient_uid: +patientSel.value,
      reason     : reasonInput.value,
      cancelled  : false
    }
  };

  await gxFetch('/booking', {
    method : 'POST',
    headers: { 'Content-Type':'application/json' },
    body   : JSON.stringify(body)
  });

  createForm.reset();
  await loadBookings();
});

/* ------------------------------------------------------------------ */
/*   Edit & Delete                                                    */
/* ------------------------------------------------------------------ */
bookingsBody.addEventListener('click', async e => {
  const row = e.target.closest('tr');
  if (!row) return;

  const id = row.dataset.id;

  /* delete -------------------------------------------------------- */
  if (e.target.classList.contains('del')) {
    if (confirm('Delete this booking?')) {
      await gxFetch(`/booking/${id}`, {
        method : 'PUT',
        headers: { 'Content-Type':'application/json' },
        body   : JSON.stringify({ model:{ uid:+id, cancelled:true } })
      });
      await loadBookings();
    }
    return;
  }

  /* edit ---------------------------------------------------------- */
  if (e.target.classList.contains('edit')) {
    const oldTime = row.children[0].textContent;
    const newTime = prompt('New time (HH:MM)', oldTime);
    if (!newTime || !/^\d{2}:\d{2}$/.test(newTime)) return;

    const newDur  = prompt('New duration (minutes)', row.dataset.duration) || row.dataset.duration;

    await gxFetch(`/booking/${id}`, {
      method : 'PUT',
      headers: { 'Content-Type':'application/json' },
      body   : JSON.stringify({
        model:{
          uid       : +id,
          start_time: `${today}T${newTime}:00`,
          duration  : +newDur
        }
      })
    });
    await loadBookings();
  }
});
