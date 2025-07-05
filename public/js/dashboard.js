// public/js/dashboard.js
import { gxFetch } from './api.js';

/* ------------ helpers ------------ */
const $ = s => document.querySelector(s);
const today = new Date().toISOString().split('T')[0];   // YYYY-MM-DD

/* ------------ DOM ------------ */
const diaryTitle   = $('#diaryTitle');
const bookingsBody = $('#bookings tbody');
const createForm   = $('#createForm');
const patientSel   = $('#patientSelect');
const timeInput    = $('#time');
const durInput     = $('#duration');
const reasonInput  = $('#reason');

/* ------------ state we need for later calls ------------ */
let entityUid, diaryUid, bookingTypeUid, bookingStatusUid;

/* =========================================================
   Bootstrap: diaries → booking types → patients → bookings
   ========================================================= */
(async function init () {
  /* 1 — get one diary (first one is fine for the test) */
  const diaries = await gxFetch('/diary?fields=["uid","entity_uid","name"]');
  ({ uid: diaryUid, entity_uid: entityUid } = diaries.data[0]);
  diaryTitle.textContent = diaries.data[0].name;

  /* 2 — booking type “Consultation” */
  const types = await gxFetch(
    `/booking_type?fields=["uid","name","booking_status_uid"]` +
    `&filter=["AND",` +
      `["=",["I","entity_uid"],["L",${entityUid}]],` +
      `["=",["I","diary_uid" ],["L",${diaryUid}]]` +
    `]`
  );
  const consult = types.data.find(t => t.name.toLowerCase() === 'consultation');
  bookingTypeUid   = consult.uid;
  bookingStatusUid = consult.booking_status_uid;

  /* 3 — patients for the <select> */
  const patients = await gxFetch(
    `/patient?fields=["uid","name","surname"]` +
    `&filter=["=",["I","entity_uid"],["L",${entityUid}]]` +
    `&limit=100`
  );
  patientSel.innerHTML = patients.data
    .map(p => `<option value="${p.uid}">${p.surname} ${p.name}</option>`)
    .join('');

  /* 4 — first list of bookings */
  await loadBookings();
})();

/* ----------------------------------
   Pull bookings for today & render
   ---------------------------------- */
async function loadBookings () {
  const res = await gxFetch(
    `/booking?fields=[` +
      `["AS",["I","patient_uid","surname"],"patient_surname"],` +
      `["AS",["I","patient_uid","name"   ],"patient_name"   ],` +
      `"uid","start_time","duration","reason","cancelled"` +
    `]` +
    `&filter=["AND",` +
      `["=",["I","diary_uid"],["L",${diaryUid}]],` +
      `["=",["::",["I","start_time"],["I","date"]],["L","${today}"]],` +
      `["NOT",["I","cancelled"]]` +
    `]`
  );

  bookingsBody.innerHTML = res.data.map(b => {
    const hhmm = b.start_time.split('T')[1].slice(0,5);
    return `<tr data-id="${b.uid}" data-duration="${b.duration}">
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

/* ---------- create ---------- */
createForm.addEventListener('submit', async e => {
  e.preventDefault();

  await gxFetch('/booking', {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({
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
    })
  });

  createForm.reset();
  await loadBookings();
});

/* ---------- edit & delete ---------- */
bookingsBody.addEventListener('click', async e => {
  const row = e.target.closest('tr');
  if (!row) return;
  const id = +row.dataset.id;

  /* delete */
  if (e.target.classList.contains('del')) {
    if (confirm('Delete this booking?')) {
      await gxFetch(`/booking/${id}`, {
        method : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ model: { uid:id, cancelled:true } })
      });
      await loadBookings();
    }
    return;
  }

  /* edit */
  if (e.target.classList.contains('edit')) {
    const oldTime = row.children[0].textContent;
    const newTime = prompt('New time (HH:MM)', oldTime);
    if (!newTime || !/^\d{2}:\d{2}$/.test(newTime)) return;

    const newDur = prompt('New duration (minutes)', row.dataset.duration) || row.dataset.duration;

    await gxFetch(`/booking/${id}`, {
      method : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        model: {
          uid       : id,
          start_time: `${today}T${newTime}:00`,
          duration  : +newDur
        }
      })
    });
    await loadBookings();
  }
});
