// public/js/dashboard.js
import { gxFetch } from './api.js';

/* helpers */
const $   = s => document.querySelector(s);
const enc = o => encodeURIComponent(JSON.stringify(o));
const today = new Date().toISOString().split('T')[0];
const hhmm  = d => d.toTimeString().slice(0,5);
const toast = m => { const t=document.createElement('div');t.textContent=m;
  t.className='toast';document.body.append(t);setTimeout(()=>t.remove(),3500); };

/* DOM */
const diaryTitle   = $('#diaryTitle');
const bookingsBody = $('#bookings tbody');
const createBtn    = $('#openCreate');
const createDlg    = $('#createDialog');
const editDlg      = $('#editDialog');
const patientSel   = $('#patientSelect');
const typeSel      = $('#typeSelect');
const cTime   = $('#c_time');
const cDate = $('#c_date');
const cDur    = $('#c_duration');
const cReason = $('#c_reason');
const eTime   = $('#e_time');
const eDur    = $('#e_duration');
const eReason = $('#e_reason');
const statusSel = $('#statusSelect');

/* runtime */
let entityUid, diaryUid, treatingDoctorUid, serviceCenterUid;
let bookingTypeUid, bookingStatusUid;
let statusMap = [];  

/* bootstrap */
(async ()=>{ try{
  await loadDiary();
  await loadBookingTypes();
  await loadBookingStatuses(); 
  await loadPatients();
  await renderBookings();
}catch(e){console.error(e);toast('Initial load failed');} })();

/* -------------- data loaders ---------------- */
async function loadDiary(){
  const f=['uid','entity_uid','name','treating_doctor_uid','service_center_uid'];
  const {data:[d]} = await gxFetch(`/diary?fields=${enc(f)}`);
  diaryUid          = d.uid;
  entityUid         = d.entity_uid;
  treatingDoctorUid = d.treating_doctor_uid;   // NEW
  serviceCenterUid  = d.service_center_uid;    // NEW
  diaryTitle.textContent = d.name;
}

/* --------- load statuses once ---------- */
async function loadBookingStatuses () {
  const f = ['uid','name','disabled'];
  const filter = ['AND',
      ['=', ['I','entity_uid'], ['L', entityUid]],
      ['=', ['I','diary_uid' ], ['L', diaryUid ]],
      ['NOT',['I','disabled']]
  ];
  const { data } =
      await gxFetch(`/booking_status?fields=${enc(f)}&filter=${enc(filter)}`);

  statusMap = data;
  statusSel.innerHTML =
    data.map(s => `<option value="${s.uid}">${s.name}</option>`).join('');
}

async function loadBookingTypes(){
  const f=['uid','name','booking_status_uid'];
  const filter=['AND',['=',['I','entity_uid'],['L',entityUid]],['=',['I','diary_uid'],['L',diaryUid]]];
  const {data} = await gxFetch(`/booking_type?fields=${enc(f)}&filter=${enc(filter)}`);
  const def = data.find(t=>t.name.toLowerCase()==='consultation') || data[0];
  bookingTypeUid=def.uid; bookingStatusUid=def.booking_status_uid;
  typeSel.innerHTML = data.map(t=>`<option value="${t.uid}|${t.booking_status_uid}">${t.name}</option>`).join('');
  typeSel.value=`${bookingTypeUid}|${bookingStatusUid}`;
}

async function loadPatients(){
  const f=['uid','name','surname'];
  const filter=['=', ['I','entity_uid'], ['L',entityUid]];
  const {data} = await gxFetch(`/patient?fields=${enc(f)}&filter=${enc(filter)}&limit=500`);
  patientSel.innerHTML = data.map(p=>`<option value="${p.uid}">${p.surname} ${p.name}</option>`).join('');
}

/* -------------- table renderer -------------- */
async function renderBookings(){
  const fields=[
    ['AS',['I','patient_uid','surname'],'patient_surname'],
    ['AS',['I','patient_uid','name'],'patient_name'],
    'uid','start_time','duration','reason'
  ];
  const filter=['AND',
    ['=', ['I','diary_uid'], ['L',diaryUid]],
    ['=', ['::',['I','start_time'],['I','date']], ['L',today]],
    ['NOT',['I','cancelled']]
  ];
  const {data}=await gxFetch(`/booking?fields=${enc(fields)}&filter=${enc(filter)}`);
  bookingsBody.innerHTML = data.map(b=>`
    <tr data-id="${b.uid}" data-duration="${b.duration}">
      <td>${b.start_time.slice(11,16)}</td>
      <td>${b.patient_surname??''} ${b.patient_name??''}</td>
      <td>${b.reason??''}</td>
      <td>
        <button class="edit">✎</button>
        <button class="del">🗑</button>
      </td>
    </tr>`).join('');
}



/* ─────────────── create-booking workflow ──────────────── */

/* 1️⃣  “New booking” button opens the dialog */
createBtn.onclick = () => {
  /* make sure the required <select>s have something selected */
  if (patientSel.selectedIndex === -1) patientSel.selectedIndex = 0;
  if (typeSel   .selectedIndex === -1) typeSel   .selectedIndex = 0;
  if (statusSel .selectedIndex === -1) statusSel .selectedIndex = 0;

  /* pre-fill date/time */
  cDate.value = today;
  cTime.value = new Date().toTimeString().slice(0, 5);
  cDur.value  = 15;
  cReason.value = '';
  createDlg.showModal();
};

/* 2️⃣  “Cancel” button just closes the dialog */
createDlg.querySelector('.cancel').onclick = () => createDlg.close();

/* 3️⃣  Submit  →  POST /api/booking */
createDlg.addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const [typeUidStr, fallback] = typeSel.value.split('|');
    const typeUid   = Number(typeUidStr);
    const statusUid = Number(statusSel.value)            // chosen status
                   || Number(fallback)                   // default from type
                   || bookingStatusUid;                  // last resort

    const dateISO = cDate.value || today;

    await gxFetch('/booking', {
      method : 'POST',
      headers: { 'Content-Type':'application/json' },
      body   : JSON.stringify({
        model : {
          uid                : null,
          entity_uid         : entityUid,
          diary_uid          : diaryUid,
          booking_type_uid   : typeUid,
          booking_status_uid : statusUid,   // never null now ✅
          patient_uid        : +patientSel.value,
          start_time         : `${dateISO}T${cTime.value}:00`,
          duration           : +cDur.value,
          reason             : cReason.value || null,
          cancelled          : false
        },
        fields : ['uid']
      })
    });

    createDlg.close();
    toast('Booking created');
    await renderBookings();
  } catch (err) {
    console.error(err);
    toast('Create failed');
  }
});





/* ---------------- edit / delete ------------- */
bookingsBody.onclick = async ev=>{
  const row = ev.target.closest('tr'); if(!row) return;
  const id = +row.dataset.id;

  /* Delete */
  if(ev.target.classList.contains('del')){
    if(!confirm('Delete this booking?')) return;
    try{
      await gxFetch(`/booking/${id}`,{
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({model:{uid:id,cancelled:true}})
      });
      toast('Deleted'); await renderBookings();
    }catch(e){console.error(e);toast('Delete failed');}
    return;
  }

  /* Edit */
  if(ev.target.classList.contains('edit')){
    eTime.value = row.children[0].textContent;
    eDur.value  = row.dataset.duration;
    eReason.value=row.children[2].textContent;
    editDlg.showModal();
    editDlg.querySelector('.cancel').onclick = ()=>editDlg.close();  // NEW

    editDlg.onsubmit = async e=>{
      e.preventDefault();
      try{
        await gxFetch(`/booking/${id}`,{
          method:'PUT',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({model:{
            uid:id,
            start_time:`${today}T${eTime.value}:00`,
            duration:+eDur.value,
            reason:eReason.value
        }})});
        editDlg.close();toast('Updated');await renderBookings();
      }catch(er){console.error(er);toast('Update failed');}
    };
  }
};

/* toast css */
(function(){
  const css='.toast{position:fixed;bottom:1rem;right:1rem;background:#333;color:#fff;padding:.5rem .8rem;border-radius:4px;font-size:.85rem}';
  const s=document.createElement('style');s.textContent=css;document.head.append(s);
})();
