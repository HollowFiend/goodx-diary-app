// public/js/dashboard.js
import { gxFetch } from './api.js';

/* ─── Helpers ───────────────────────────────── */
// grab the <form> elements by their IDs so we can listen for submissions
const createForm = document.getElementById('createForm');
const editForm   = document.getElementById('editForm');

// tiny helper to make document.querySelector shorter
const $ = sel => document.querySelector(sel);

// helper to URL-encode a JSON object for our gxFetch calls
const enc = obj => encodeURIComponent(JSON.stringify(obj));

// today's date in YYYY-MM-DD format (used as a fallback)
const today = new Date().toISOString().slice(0,10);

// tiny "toast" helper to show a temporary message in bottom-right
const toast = msg => {
  const t = document.createElement('div');
  t.textContent = msg;
  t.className = 'toast';
  document.body.append(t);
  setTimeout(() => t.remove(), 3500);
};

/* ─── DOM refs ────────────────────────────── */
const diaryTitle = $('#diaryTitle');       // the <h1> that shows the diary name
const calendarEl = document.getElementById('calendar');  // where FullCalendar will render

// the Create dialog and its inputs
const createDlg  = $('#createDialog');
const patientSel = $('#patientSelect');
const typeSel    = $('#typeSelect');
const statusSel  = $('#statusSelect');
const cDate      = $('#c_date');
const cTime      = $('#c_time');
const cDur       = $('#c_duration');
const cReason    = $('#c_reason');

// the Edit dialog and its inputs
const editDlg    = $('#editDialog');
const eTime      = $('#e_time');
const eDur       = $('#e_duration');
const eReason    = $('#e_reason');

/* ─── Runtime state ───────────────────────── */
let entityUid, diaryUid, treatingDoctorUid, serviceCenterUid;
let bookingTypeUid, bookingStatusUid;
let calendar;  // will hold the FullCalendar instance

/* ── Time-dropdown helper ───────────────── */
// replaces type="time" inputs with a <select> of 15-min slots for 6:00–19:45
function populateTimeSelect(sel) {
  const opts = [];
  for (let h = 6; h < 20; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      opts.push(`<option value="${hh}:${mm}">${hh}:${mm}</option>`);
    }
  }
  sel.innerHTML = opts.join('');
}

/* ─── Bootstrap ───────────────────────────── */
// main async init function – populates dropdowns, wires cancel buttons, then loads data
(async function init() {
  try {
    // 1) replace time inputs with our dropdowns
    populateTimeSelect(cTime);
    populateTimeSelect(eTime);

    // 2) wire up the Cancel buttons on both dialogs
    createDlg.querySelector('.cancel')
      .addEventListener('click', () => createDlg.close());
    editDlg.querySelectorAll('.cancel')
      .forEach(btn => btn.addEventListener('click', () => editDlg.close()));

    // 3) load all the stuff we need before showing the calendar
    await loadDiary();
    await loadBookingTypes();
    await loadBookingStatuses();
    await loadPatients();
    initCalendar();  // finally, initialize the calendar
  } catch (err) {
    console.error(err);
    toast('Failed to initialize');
  }
})();

/* ─── Loaders ─────────────────────────────── */
// Fetch diary metadata (name, UIDs) and set the page title
async function loadDiary() {
  const f = ['uid','entity_uid','name','treating_doctor_uid','service_center_uid'];
  const { data:[d] } = await gxFetch(`/diary?fields=${enc(f)}`);
  diaryUid          = d.uid;
  entityUid         = d.entity_uid;
  treatingDoctorUid = d.treating_doctor_uid;
  serviceCenterUid  = d.service_center_uid;
  diaryTitle.textContent = d.name;  // show the diary name
}

// Fetch available booking types and populate the Type <select>
async function loadBookingTypes() {
  const f = ['uid','name','booking_status_uid'];
  const filter = ['AND',
    ['=', ['I','entity_uid'], ['L', entityUid]],
    ['=', ['I','diary_uid' ], ['L', diaryUid ]]
  ];
  const { data } = await gxFetch(
    `/booking_type?fields=${enc(f)}&filter=${enc(filter)}`
  );
  // pick "Consultation" as default if it exists
  const def = data.find(t => t.name.toLowerCase()==='consultation') || data[0];
  bookingTypeUid   = def.uid;
  bookingStatusUid = def.booking_status_uid;

  // build <option>s like <option value="12|16">Consultation</option>
  typeSel.innerHTML = data
    .map(t => `<option value="${t.uid}|${t.booking_status_uid}">${t.name}</option>`)
    .join('');
  typeSel.value = `${bookingTypeUid}|${bookingStatusUid}`;
}

// Fetch booking statuses and populate the Status <select>
async function loadBookingStatuses() {
  const f = ['uid','name','disabled'];
  const filter = ['AND',
    ['=', ['I','entity_uid'], ['L', entityUid]],
    ['=', ['I','diary_uid' ], ['L', diaryUid ]],
    ['NOT',['I','disabled']]
  ];
  const { data } = await gxFetch(
    `/booking_status?fields=${enc(f)}&filter=${enc(filter)}`
  );
  statusSel.innerHTML = data
    .map(s => `<option value="${s.uid}">${s.name}</option>`)
    .join('');
}

// Fetch patients and fill the Patient <select>
async function loadPatients() {
  const f = ['uid','name','surname'];
  const filter = ['=', ['I','entity_uid'], ['L', entityUid]];
  const { data } = await gxFetch(
    `/patient?fields=${enc(f)}&filter=${enc(filter)}&limit=500`
  );
  patientSel.innerHTML = data
    .map(p => `<option value="${p.uid}">${p.surname} ${p.name}</option>`)
    .join('');
}

/* ─── Calendar ────────────────────────────── */
function initCalendar() {
  calendar = new FullCalendar.Calendar(calendarEl, {
    // ─── sizing & now-indicator ─────────────────────────────
    height                : 'auto',
    aspectRatio           : 1.35,
    expandRows            : true,
    handleWindowResize    : true,
    windowResizeDelay     : 150,

    nowIndicator          : true,
    now                   : today,
    nowIndicatorClassNames: ['now-indicator'],

    // ─── toolbar w/ custom “➕ New” ──────────────────────────
    customButtons: {
      newBooking: {
        text: '➕ New',
        click() {
          // same thing for create button now just adding it in calendar for the on createBtn.onclick
          cDate.value   = today;
          cTime.value   = new Date().toTimeString().slice(0,5);
          cDur.value    = 15;
          cReason.value = '';
          createDlg.showModal();
        }
      }
    },
    headerToolbar: {
      left  : 'prev,next today newBooking',
      center: 'title',
      right : 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
    },

    // ─── dayGrid “+more” pop-overs ───────────────────────────
    dayMaxEvents    : 3,
    dayMaxEventRows : false,
    moreLinkClick   : 'popover',
    dayPopoverFormat: { month:'long', day:'numeric', weekday:'long' },

    // clicking on an empty slot opens Create dialog
    dateClick: info => {
      cDate.value   = info.dateStr;
      cTime.value   = info.date.toTimeString().slice(0,5);
      cDur.value    = 15;
      cReason.value = '';
      createDlg.showModal();
    },

    // enable drag & resize
    editable             : true,  // global drag/resize enabled
    eventStartEditable   : true,  // can drag start
    eventDurationEditable: true,  // can resize length

    // ─── load + render events ───────────────────────────────
    events       : fetchEvents,

    // ─── native tooltip on hover ────────────────────────────
    eventDidMount: info => {
      if (info.event.extendedProps.reason) {
        info.el.setAttribute('title', info.event.extendedProps.reason);
      }
    },

    // dragging an event to a new time
    eventDrop: async info => {
      const { id, start, end } = info.event;
      const newStart = start.toISOString();
      const newDur   = Math.round((end - start) / 60000);
      try {
        await gxFetch(`/booking/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: { uid: id, start_time: newStart, duration: newDur }
          })
        });
        toast('Booking moved');
      } catch (e) {
        console.error(e);
        toast('Move failed');
        info.revert();  // revert in UI if API fails
      }
    },

    // resizing an event’s length
    eventResize: async info => {
      const { id, start, end } = info.event;
      const newDur = Math.round((end - start) / 60000);
      try {
        await gxFetch(`/booking/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: { uid: id, duration: newDur }
          })
        });
        toast('Booking resized');
      } catch (e) {
        console.error(e);
        toast('Resize failed');
        info.revert();
      }
    },

    // clicking an event to open the Edit dialog
    eventClick: onEventClick
  });

  calendar.render();
}






/* ─── fetchEvents ────────────────────────── */
// load bookings from API for the calendar’s visible range
async function fetchEvents(info, successCallback) {
  const fields = [
    ['AS',['I','patient_uid','surname'],'patient_surname'],
    ['AS',['I','patient_uid','name'   ],'patient_name'],
    'uid','start_time','duration','reason'
  ];
  const filter = ['AND',
  ['=',   ['I','diary_uid'], ['L', diaryUid]],
  ['>=',  ['::',['I','start_time'],['I','date']], ['L', info.startStr.split('T')[0]]],
  ['<',   ['::',['I','start_time'],['I','date']], ['L', info.endStr.split('T')[0]]],
  ['NOT', ['I','cancelled']]     // ← this line filters out deleted events
];
  const { data } = await gxFetch(
    `/booking?fields=${enc(fields)}&filter=${enc(filter)}`
  );
  successCallback(data.map(b => ({
    id    : b.uid,
    title : `${b.patient_surname||''} ${b.patient_name||''}`.trim(),
    start : b.start_time,
    end   : new Date(new Date(b.start_time).getTime() + b.duration*60000).toISOString(),
    extendedProps: { reason: b.reason }
  })));
}


/* ─── onEventClick ────────────────────────── */
// handle clicking an existing event to edit or delete
function onEventClick({ event }) {
  // remember the event’s original date for updates (YYYY-MM-DD)
  const originalDate = event.start.toISOString().split('T')[0];

  /// fill the form with current values
  eTime.value   = event.start.toTimeString().slice(0,5);
  eDur.value    = Math.round((event.end - event.start)/60000);
  eReason.value = event.extendedProps.reason;
  editDlg.showModal();

  /// wire up the Delete button
  editDlg.querySelector('.delete').onclick = async () => {
    if (!confirm('Delete this booking?')) return;
    await gxFetch(`/booking/${event.id}`, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ model:{ uid:event.id, cancelled:true } })
    });
    editDlg.close();
    toast('Deleted');
    calendar.refetchEvents();
  };

  // wire up the Update (form submit)
  editForm.onsubmit = async ev => {
    ev.preventDefault();

    // build new start_time from original date + new time
    const newStart = `${originalDate}T${eTime.value}:00`;

    await gxFetch(`/booking/${event.id}`, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        model: {
          uid         : event.id,
          start_time  : newStart,
          duration    : +eDur.value,
          reason      : eReason.value
        }
      })
    });

    editDlg.close();
    toast('Updated');
    calendar.refetchEvents();
  };
}



/* ─── Create flow ─────────────────────────── */
//createBtn.onclick = () => {
  // ensure a selection
//  if(patientSel.selectedIndex===-1) patientSel.selectedIndex = 0;
 // if(typeSel   .selectedIndex===-1) typeSel   .selectedIndex = 0;
 // if(statusSel .selectedIndex===-1) statusSel .selectedIndex = 0;

  // prefill date/time
 // cDate .value = today;
 // cTime .value = new Date().toTimeString().slice(0,5);
  //cDur  .value = 15;
 // cReason.value = '';
 // createDlg.showModal();
//};

//createDlg.querySelector('.cancel').onclick = () => createDlg.close();




/* ─── Create flow ─────────────────────────── */
// handle the Create-booking form submission

createForm.addEventListener('submit', async e => {
  e.preventDefault();
  const [typeUidStr,fallback] = typeSel.value.split('|');
  const typeUid   = Number(typeUidStr);
  const statusUid = Number(statusSel.value) || Number(fallback) || bookingStatusUid;
  const dateISO   = cDate.value || today;

  await gxFetch('/booking', {
    method : 'POST',
    headers: { 'Content-Type':'application/json' },
    body   : JSON.stringify({
      model: {
        uid                 : null,
        entity_uid          : entityUid,
        diary_uid           : diaryUid,
        booking_type_uid    : typeUid,
        booking_status_uid  : statusUid,
        patient_uid         : +patientSel.value,
        start_time          : `${dateISO}T${cTime.value}:00`,
        duration            : +cDur.value,
        reason              : cReason.value || null,
        cancelled           : false
      },
      fields: ['uid']
    })
  });

  createDlg.close();
  toast('Booking created');
  calendar.refetchEvents();
});

/* ─── Toast styling ───────────────────────── */
// inject the CSS for our toasts
(function(){
  const css = `
    .toast {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      background: #323232;
      color: #fff;
      padding: .6rem 1rem;
      border-radius: 4px;
      font-size: .85rem;
      opacity: .95;
    }
  `;
  const s = document.createElement('style');
  s.textContent = css;
  document.head.append(s);
})();




// Log out: clear cookies + redirect to login
document.querySelector('#logout').addEventListener('click', async () => {
  try {
    await gxFetch('/session', { method: 'DELETE' });
  } catch (e) {
    // ignore if session delete not supported
  }
  // Clear our auth cookies
  document.cookie = "__session=; path=/; max-age=0";
  document.cookie = "session_id=; path=/; max-age=0";
  // back to root so login 
  window.location.href = '/'; 
});