// public/js/dashboard.js – revamped to meet every spec in the GoodX
// applicant‑test brief (CRUD on bookings, patient picker, etc.)
// ---------------------------------------------------------------------------
// Assumptions
//   • api.js exports gxFetch(path, opts) which already sends credentials
//   • The surrounding HTML contains the elements referenced by the selectors
//   • styles / minimal dialog polyfill are loaded in <head>
// ---------------------------------------------------------------------------

import { gxFetch } from './api.js';

/* ───────────────────────── helpers ───────────────────────── */
const $          = sel => document.querySelector(sel);
const enc        = obj => encodeURIComponent(JSON.stringify(obj));
const todayISO   = () => new Date().toISOString().split('T')[0];
const hhmm       = date => date.toTimeString().slice(0,5);
const alertToast = msg => {
  const t = document.createElement('div');
  t.textContent = msg;
  t.className = 'toast';
  document.body.append(t);
  setTimeout(()=>t.remove(), 3500);
};

/* ───────────────────────── DOM refs ───────────────────────── */
const diaryTitle     = $('#diaryTitle');
const bookingsBody   = $('#bookings tbody');
const createBtn      = $('#openCreate');
const createDlg      = $('#createDialog');
const editDlg        = $('#editDialog');
const patientSel     = $('#patientSelect');
const typeSel        = $('#typeSelect');

// 🆕 form inputs inside dialogs
const cTime   = createDlg.querySelector('#c_time');
const cDur    = createDlg.querySelector('#c_duration');
const cReason = createDlg.querySelector('#c_reason');
const eTime   = editDlg.querySelector('#e_time');
const eDur    = editDlg.querySelector('#e_duration');
const eReason = editDlg.querySelector('#e_reason');

/* ───────────────────────── runtime state ──────────────────── */
let entityUid, diaryUid;
let bookingTypeUid, bookingStatusUid;
const dateStr = todayISO();

/* ───────────────────────── bootstrap ───────────────────────── */
(async function init () {
  try {
    await hydrateDiary();
    await hydrateBookingTypes();
    await hydratePatients();
    await renderBookings();
  } catch (err) {
    console.error(err);
    alertToast('Failed initial load');
  }
})();

/* ──────────────────────── data loaders ─────────────────────── */
async function hydrateDiary () {
  const diaries = await gxFetch(`/diary?fields=${enc(['uid','entity_uid','name'])}`);
  ({ uid: diaryUid, entity_uid: entityUid, name: diaryTitle.textContent } = diaries.data[0]);
}

async function hydrateBookingTypes () {
  const f = ['uid','name','booking_status_uid'];
  const filter = ['AND',
    ['=', ['I','entity_uid'], ['L', entityUid]],
    ['=', ['I','diary_uid' ], ['L', diaryUid ]]
  ];
  const res = await gxFetch(`/booking_type?fields=${enc(f)}&filter=${enc(filter)}`);
  // default to Consultation, else first
  const consult = res.data.find(t=>t.name.toLowerCase()==='consultation') || res.data[0];
  bookingTypeUid   = consult.uid;
  bookingStatusUid = consult.booking_status_uid;
  // populate select
  typeSel.innerHTML = res.data.map(t=>`<option value="${t.uid}|${t.booking_status_uid}">${t.name}</option>`).join('');
  typeSel.value = `${bookingTypeUid}|${bookingStatusUid}`;
}

async function hydratePatients () {
  const f = ['uid','name','surname'];
  const filter = ['=', ['I','entity_uid'], ['L', entityUid]];
  const res = await gxFetch(`/patient?fields=${enc(f)}&filter=${enc(filter)}&limit=500`);
  patientSel.innerHTML = res.data.map(p=>`<option value="${p.uid}">${p.surname} ${p.name}</option>`).join('');
}

/* ─────────────────────── render bookings ──────────────────── */
async function renderBookings () {
  const fields = [
    ['AS',['I','patient_uid','surname'],'patient_surname'],
    ['AS',['I','patient_uid','name'   ],'patient_name'   ],
    'uid','start_time','duration','reason','cancelled'
  ];
  const filter = ['AND',
    ['=', ['I','diary_uid'], ['L', diaryUid]],
    ['=', ['::',['I','start_time'],['I','date']], ['L', dateStr]],
    ['NOT',['I','cancelled']]
  ];
  const res = await gxFetch(`/booking?fields=${enc(fields)}&filter=${enc(filter)}`);

  bookingsBody.innerHTML = res.data.map(b=>`
    <tr data-id="${b.uid}" data-duration="${b.duration}">
      <td>${b.start_time.split('T')[1].slice(0,5)}</td>
      <td>${b.patient_surname ?? ''} ${b.patient_name ?? ''}</td>
      <td>${b.reason ?? ''}</td>
      <td>
        <button class="edit" title="Edit">✎</button>
        <button class="del"  title="Delete">🗑</button>
      </td>
    </tr>`).join('');
}

/* ───────────────────────── create flow ─────────────────────── */
createBtn.addEventListener('click', ()=>{
  // reset & open dialog
  cTime.value   = hhmm(new Date());
  cDur.value    = 15;
  cReason.value = '';
  createDlg.showModal();
});

createDlg.addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const [typeUid,statusUid] = typeSel.value.split('|').map(Number);
    await gxFetch('/booking', {
      method : 'POST',
      headers: { 'Content-Type':'application/json' },
body: JSON.stringify({
  model: {
    uid                : null,                 // or 'new' + Date.now()
    entity_uid         : entityUid,
    diary_uid          : diaryUid,
    booking_type_uid   : typeUid,
    booking_status_uid : statusUid,
    patient_uid        : +patientSel.value,
    treating_doctor_uid: treatingDoctorUid,    // (lookup once from diary cache)
    service_center_uid : serviceCenterUid,     // (lookup once from diary cache)
    start_time         : `${dateStr}T${cTime.value}:00`,
    duration           : +cDur.value,
    reason             : cReason.value || null,
    cancelled          : false
  },
  fields: ['uid']      // only if you care which columns come back
})

    });
    createDlg.close();
    alertToast('Booking created');
    await renderBookings();
  } catch(err) {
    console.error(err);
    alertToast('Create failed');
  }
});

/* ───────────────────────── edit / delete ───────────────────── */
bookingsBody.addEventListener('click', async e=>{
  const row = e.target.closest('tr');
  if(!row) return;
  const id = +row.dataset.id;

  // DELETE ---------------------------------------------------
  if(e.target.classList.contains('del')) {
    if(!confirm('Delete this booking?')) return;
    try {
      await gxFetch(`/booking/${id}`,{
        method :'PUT',
        headers:{'Content-Type':'application/json'},
        body   :JSON.stringify({model:{uid:id, cancelled:true}})
      });
      alertToast('Deleted');
      await renderBookings();
    } catch(err){
      console.error(err); alertToast('Delete failed');
    }
    return;
  }

  // EDIT -----------------------------------------------------
  if(e.target.classList.contains('edit')) {
    // pre‑fill dialog with current row values
    eTime.value   = row.children[0].textContent;
    eDur.value    = row.dataset.duration;
    eReason.value = row.children[2].textContent;
    editDlg.showModal();

    editDlg.onsubmit = async ev => {
      ev.preventDefault();
      try {
        await gxFetch(`/booking/${id}`,{
          method :'PUT',
          headers:{'Content-Type':'application/json'},
          body   :JSON.stringify({
            model:{
              uid       :id,
              start_time:`${dateStr}T${eTime.value}:00`,
              duration  :+eDur.value,
              reason    :eReason.value
            }
          })
        });
        editDlg.close();
        alertToast('Updated');
        await renderBookings();
      } catch(err){
        console.error(err); alertToast('Update failed');
      }
    };
  }
});

/* ───────────────────────── misc styling helper ─────────────── */
// quick‑n‑dirty toast styles (inject once)
(function(){
  const css = `.toast{position:fixed;bottom:1rem;right:1rem;background:#333;color:#fff;padding:.6rem 1rem;border-radius:4px;font-size:.9rem;opacity:.95}`;
  const s = document.createElement('style'); s.textContent = css; document.head.append(s);
})();
