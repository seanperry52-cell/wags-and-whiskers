// ── Mobile nav toggle ──────────────────────────────────────────────────────
const navToggle = document.getElementById('navToggle');
const navLinks = document.querySelector('.nav-links');

navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

// ── Scroll-reveal (3D) ──────────────────────────────────────────────────────
const revealEls = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

revealEls.forEach(el => revealObserver.observe(el));

// Jumping straight to a section via an anchor link (e.g. the "Book Now" nav
// button) can land on a tall .reveal section before the IntersectionObserver
// fires, leaving it stuck at opacity:0. Reveal the target immediately instead.
function revealTarget(hash) {
  const target = document.querySelector(hash);
  if (!target) return;
  target.querySelectorAll('.reveal').forEach(el => {
    el.classList.add('in-view');
    revealObserver.unobserve(el);
  });
  if (target.classList.contains('reveal')) {
    target.classList.add('in-view');
    revealObserver.unobserve(target);
  }
}

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', () => revealTarget(link.getAttribute('href')));
});

if (window.location.hash) revealTarget(window.location.hash);

// ── Parallax floating paws ─────────────────────────────────────────────────
const paws = document.querySelectorAll('.paw');

window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  paws.forEach((paw, i) => {
    const speed = 0.15 + (i % 3) * 0.08;
    paw.style.transform = `translate3d(0, ${scrollY * speed}px, 0)`;
  });
}, { passive: true });

// ── 3D tilt on service/review cards ────────────────────────────────────────
document.querySelectorAll('.tilt-inner').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03,1.03,1.03)`;
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1,1,1)';
  });
});

// ── Sticky nav shadow on scroll ────────────────────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.style.boxShadow = window.scrollY > 20
    ? '0 4px 20px rgba(74,55,40,0.12)'
    : '0 2px 16px rgba(74,55,40,0.06)';
}, { passive: true });

// ── Availability calendar ───────────────────────────────────────────────────
const BOOKING_API = 'https://desktop-rac3kc3.tail27701f.ts.net/wags-booking';

function ymd(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const calMonth = new Date();
calMonth.setDate(1);

async function renderCalendar() {
  const calEl = document.getElementById('availabilityCalendar');
  const monthLabel = document.getElementById('calMonthLabel');
  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();
  monthLabel.textContent = calMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const from = ymd(year, month, 1);
  const to = ymd(year, month, daysInMonth);

  let availability = { blocked: [], booked: [] };
  try {
    const res = await fetch(`${BOOKING_API}/api/availability?from=${from}&to=${to}`);
    if (res.ok) availability = await res.json();
  } catch (err) {
    // booking server unreachable — show calendar without availability data
  }

  const blockedSet = new Set(availability.blocked || []);
  const bookedSet = new Set(availability.booked || []);
  const todayStr = ymd(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  calEl.innerHTML = '';
  ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(d => {
    const cell = document.createElement('div');
    cell.className = 'cal-weekday';
    cell.textContent = d;
    calEl.appendChild(cell);
  });
  for (let i = 0; i < firstWeekday; i++) calEl.appendChild(document.createElement('div'));
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = ymd(year, month, day);
    const cell = document.createElement('div');
    cell.className = 'cal-day';
    if (dateStr === todayStr) cell.classList.add('cal-today');
    if (blockedSet.has(dateStr)) cell.classList.add('cal-unavailable');
    else if (bookedSet.has(dateStr)) cell.classList.add('cal-booked');
    else cell.classList.add('cal-available');
    cell.textContent = day;
    calEl.appendChild(cell);
  }
}

document.getElementById('calPrev').addEventListener('click', () => {
  calMonth.setMonth(calMonth.getMonth() - 1);
  renderCalendar();
});
document.getElementById('calNext').addEventListener('click', () => {
  calMonth.setMonth(calMonth.getMonth() + 1);
  renderCalendar();
});
renderCalendar();

// ── Drop-in visit time slots ────────────────────────────────────────────
// Each drop-in visit books a single 30-minute slot.
const DROP_IN_SERVICES = new Set(['Drop-In Visit']);

const serviceTypeSelect = document.getElementById('serviceType');
const startDateInput = document.getElementById('startDate');
const startTimeGroup = document.getElementById('startTimeGroup');
const startTimeLabel = document.getElementById('startTimeLabel');
const startTimeInput = document.getElementById('startTime');
const endTimeGroup = document.getElementById('endTimeGroup');
const endTimeInput = document.getElementById('endTime');
const dropinSlotsGroup = document.getElementById('dropinSlotsGroup');
const dropinSlots = document.getElementById('dropinSlots');
const endDateInput = document.getElementById('endDate');
const scheduleFields = document.getElementById('scheduleFields');
const ongoingScheduleNote = document.getElementById('ongoingScheduleNote');
const clientTypeRadios = document.querySelectorAll('input[name="clientType"]');

// Drop-off / pick-up time pickers offer the same 7:00 AM – 9:00 PM,
// 30-minute slot options as the drop-in time picker.
function populateTimeOptions(select) {
  select.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.disabled = true;
  placeholder.selected = true;
  placeholder.textContent = 'Select a time';
  select.appendChild(placeholder);
  for (let mins = 7 * 60; mins <= 21 * 60; mins += 30) {
    const h = String(Math.floor(mins / 60)).padStart(2, '0');
    const m = String(mins % 60).padStart(2, '0');
    const time = `${h}:${m}`;
    const opt = document.createElement('option');
    opt.value = time;
    opt.textContent = formatTime(time);
    select.appendChild(opt);
  }
}
populateTimeOptions(startTimeInput);
populateTimeOptions(endTimeInput);

// A drop-in visit can cover several check-ins on the same day, so the
// slot picker allows selecting more than one time slot.
let selectedSlots = new Set();

async function renderTimeSlots() {
  const date = startDateInput.value;

  if (!date) {
    dropinSlots.innerHTML = '<p class="slots-loading">Pick a date above to see open times.</p>';
    return;
  }

  dropinSlots.innerHTML = '<p class="slots-loading">Loading times…</p>';
  try {
    const res = await fetch(`${BOOKING_API}/api/availability/slots?date=${date}`);
    if (!res.ok) throw new Error('bad response');
    const data = await res.json();
    dropinSlots.innerHTML = '';
    (data.slots || []).forEach(s => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `slot-btn ${s.available ? 'slot-available' : 'slot-booked'}`;
      btn.textContent = formatTime(s.time);
      btn.disabled = !s.available;
      if (selectedSlots.has(s.time)) btn.classList.add('slot-selected');
      btn.addEventListener('click', () => {
        if (selectedSlots.has(s.time)) {
          selectedSlots.delete(s.time);
          btn.classList.remove('slot-selected');
        } else {
          selectedSlots.add(s.time);
          btn.classList.add('slot-selected');
        }
      });
      dropinSlots.appendChild(btn);
    });
  } catch (err) {
    dropinSlots.innerHTML = '<p class="slots-error">Could not load times — please try again.</p>';
  }
}

function updateTimeFields() {
  const serviceType = serviceTypeSelect.value;
  const isDropIn = DROP_IN_SERVICES.has(serviceType);
  const isOvernight = serviceType === 'Overnight Stay';

  if (isOvernight) {
    startTimeGroup.hidden = false;
    startTimeLabel.textContent = 'Drop-off Time';
    endTimeGroup.hidden = false;
    dropinSlotsGroup.hidden = true;
    dropinSlots.innerHTML = '';
  } else if (isDropIn) {
    startTimeGroup.hidden = true;
    endTimeGroup.hidden = true;
    endTimeInput.value = '';
    dropinSlotsGroup.hidden = false;
    selectedSlots.clear();
    renderTimeSlots();
  } else {
    startTimeGroup.hidden = false;
    startTimeLabel.textContent = 'Preferred Time';
    endTimeGroup.hidden = true;
    endTimeInput.value = '';
    dropinSlotsGroup.hidden = true;
    dropinSlots.innerHTML = '';
  }
}

function isOngoingClient() {
  return [...clientTypeRadios].find(r => r.checked)?.value === 'Ongoing';
}

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function updateBookingTypeFields() {
  const ongoing = isOngoingClient();
  scheduleFields.hidden = ongoing;
  ongoingScheduleNote.hidden = !ongoing;
  startDateInput.required = !ongoing;
  if (ongoing) {
    selectedSlots.clear();
  } else {
    updateTimeFields();
  }
}

serviceTypeSelect.addEventListener('change', () => {
  startTimeInput.value = '';
  updateTimeFields();
  updateDistancePricing();
});
startDateInput.addEventListener('change', () => {
  startTimeInput.value = '';
  if (DROP_IN_SERVICES.has(serviceTypeSelect.value)) {
    selectedSlots.clear();
    renderTimeSlots();
  }
});
clientTypeRadios.forEach(r => r.addEventListener('change', updateBookingTypeFields));
updateTimeFields();
updateBookingTypeFields();

// ── Booking form -> email + pre-filled printable contract ──────────────────
const bookingForm = document.getElementById('bookingForm');

// ── Returning-client lookup ─────────────────────────────────────────────────
// Once both email and phone are filled in, check whether this is a returning
// client and pre-fill their saved vet/emergency/pet info so they don't have
// to re-enter it on every booking.
const ownerEmailInput = document.getElementById('ownerEmail');
const ownerPhoneInput = document.getElementById('ownerPhone');
const returningClientNote = document.getElementById('returningClientNote');
let returningClientChecked = false;

async function tryReturningClientLookup() {
  const email = ownerEmailInput.value.trim();
  const phone = ownerPhoneInput.value.trim();
  if (!email || !phone || returningClientChecked) return;
  returningClientChecked = true;

  try {
    const res = await fetch(`${BOOKING_API}/api/client-lookup?email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}`);
    if (!res.ok) return;
    const data = await res.json();
    if (!data.found) return;

    const fillIfEmpty = (el, value) => {
      if (el && !el.value && value) el.value = value;
    };

    fillIfEmpty(document.getElementById('petInfo'), data.petInfo);
    fillIfEmpty(addressInput, data.address);
    for (const [key, value] of Object.entries(data.fields || {})) {
      const el = bookingForm.elements[key];
      if (!el) continue;
      if (el.tagName === 'SELECT' || el.type === 'date') {
        if (!el.value) el.value = value;
      } else {
        fillIfEmpty(el, value);
      }
    }

    if (addressInput.value) updateDistancePricing();
    returningClientNote.textContent = "Welcome back! We've filled in your saved info — please review and update anything that's changed.";
  } catch {
    // lookup is a convenience feature — fail silently
  }
}

ownerEmailInput.addEventListener('blur', tryReturningClientLookup);
ownerPhoneInput.addEventListener('blur', tryReturningClientLookup);

// Base rates, pulled from the Rates & Pricing section
const RATE_INFO = {
  'Drop-In Visit':             { rate: 16, unit: 'per visit (30 min, under 5 mi — see Rates & Pricing for other options)' },
  'Overnight Stay':            { rate: 45, unit: 'per night' },
};

// ── Distance-based drop-in pricing ──────────────────────────────────────────
const DROP_IN_RATES = { near: 16, far: 18 };
const MAX_SERVICE_MILES = 10;

const addressInput = document.getElementById('address');
const addressDistanceNote = document.getElementById('addressDistanceNote');
const distanceMilesInput = document.getElementById('distanceMiles');

let addressOutOfRange = false;

async function updateDistancePricing() {
  const address = addressInput.value.trim();
  addressOutOfRange = false;
  addressDistanceNote.classList.remove('distance-out-of-range');

  if (!DROP_IN_SERVICES.has(serviceTypeSelect.value)) {
    addressDistanceNote.textContent = '';
    distanceMilesInput.value = '';
    return;
  }

  if (!address) {
    addressDistanceNote.textContent = '';
    distanceMilesInput.value = '';
    return;
  }

  addressDistanceNote.textContent = 'Checking distance for drop-in pricing…';
  try {
    const res = await fetch(`${BOOKING_API}/api/distance?address=${encodeURIComponent(address)}`);
    const data = await res.json();
    if (!res.ok || data.miles == null) {
      addressDistanceNote.textContent = "Couldn't calculate driving distance — drop-in rate will be confirmed at booking.";
      distanceMilesInput.value = '';
      return;
    }
    const miles = data.miles;
    distanceMilesInput.value = miles.toFixed(2);

    if (miles > MAX_SERVICE_MILES) {
      addressOutOfRange = true;
      addressDistanceNote.textContent =
        `This address is approx. ${miles.toFixed(1)} mi from Misti's home, which is outside our ${MAX_SERVICE_MILES}-mile service area for drop-in visits. Please contact us directly to discuss options.`;
      addressDistanceNote.classList.add('distance-out-of-range');
      return;
    }

    const isFar = miles >= 5;
    const rate = isFar ? DROP_IN_RATES.far : DROP_IN_RATES.near;
    RATE_INFO['Drop-In Visit'] = {
      rate,
      unit: `per visit (30 min, ${isFar ? '5+' : 'under 5'} mi from Misti's home)`,
    };
    addressDistanceNote.textContent =
      `Approx. ${miles.toFixed(1)} mi from Misti's home — Drop-In rate: $${rate}/visit (30 min)`;
  } catch {
    addressDistanceNote.textContent = '';
    distanceMilesInput.value = '';
  }
}

addressInput.addEventListener('blur', updateDistancePricing);

function formatDate(value) {
  if (!value) return '____________________';
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(value) {
  if (!value) return '____________________';
  const [h, m] = value.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatTimesList(value) {
  if (!value) return '____________________';
  return value.split(',').map(t => formatTime(t.trim())).join(', ');
}

function nightsBetween(start, end) {
  if (!start || !end) return 1;
  const diff = Math.round((new Date(end) - new Date(start)) / 86400000);
  return diff > 0 ? diff : 1;
}

function checkbox(checked) {
  return checked ? '☑' : '☐';
}

const LOGO_URL = 'https://seanperry52-cell.github.io/wags-and-whiskers/assets/logo.png';

const PACKET_STYLE = `
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #2a2018; line-height: 1.6; margin: 0; }
  .page { max-width: 760px; margin: 0 auto; padding: 2rem 1.5rem; }
  .page + .page { border-top: 1px dashed #ccc; }
  @media print {
    .page { page-break-after: always; border-top: none; padding: 1rem 0.4rem; }
    .page:last-child { page-break-after: auto; }
    .print-btn { display: none; }
  }
  .print-btn { display: block; margin: 1rem auto; padding: 0.6rem 1.6rem; font-size: 1rem; cursor: pointer; }
  .cover { text-align: center; padding-top: 4rem; }
  .cover img { max-width: 320px; }
  h1.doc-title { text-align: center; font-size: 1.6rem; margin: 0 0 0.2rem; }
  .doc-sub { text-align: center; color: #6b5645; margin-bottom: 1.5rem; }
  h2.section-h { color: #2a7fb0; font-size: 1.2rem; margin: 0 0 1rem; }
  h3.sub-h { font-size: 1.05rem; margin: 1.3rem 0 0.4rem; border-bottom: 1px solid #ccc; padding-bottom: 0.2rem; }
  .field { margin: 0.3rem 0; }
  .field label { font-weight: bold; }
  .checks div { margin: 0.25rem 0; }
  .sign-block { margin-top: 2rem; }
  .sign-line { display: inline-block; min-width: 240px; border-bottom: 1px solid #2a2018; }
  .blank-line { display: inline-block; min-width: 200px; border-bottom: 1px solid #999; }
  .blank-block { border-bottom: 1px solid #999; min-height: 1.4rem; margin-bottom: 0.9rem; }
  table.rates { width: 100%; border-collapse: collapse; margin-bottom: 1.2rem; font-size: 0.92rem; }
  table.rates caption { font-weight: bold; text-align: left; background: #f3ece1; padding: 0.4rem 0.6rem; border: 1px solid #ccc; caption-side: top; }
  table.rates th, table.rates td { border: 1px solid #ccc; padding: 0.4rem 0.6rem; text-align: left; }
  table.rates td:last-child, table.rates th:last-child { text-align: right; }
`;

function ratesTables() {
  return `
  <table class="rates">
    <caption>Drop-Ins at Owner's House</caption>
    <tr><td>Drop-In 30 minutes &lt; 5 miles</td><td>$16.00</td></tr>
    <tr><td>Drop-In 30 minutes &gt; 5 miles</td><td>$18.00</td></tr>
    <tr><td>Drop-In 60 minutes &lt; 5 miles</td><td>$26.00</td></tr>
    <tr><td>Drop-In 60 minutes &gt; 5 miles</td><td>$28.00</td></tr>
    <tr><td>Additional Dog</td><td>+$8.00</td></tr>
    <tr><td>Puppy</td><td>+$4.00 to rate above</td></tr>
    <tr><td>Extended Rate 30 minutes (14+ visits) &lt; 5 miles</td><td>$15.00</td></tr>
    <tr><td>Extended Rate 30 minutes (14+ visits) &gt; 5 miles</td><td>$17.00</td></tr>
  </table>

  <table class="rates">
    <caption>Day Care at Sitter's House</caption>
    <tr><td>One Dog per Day</td><td>$40.00</td></tr>
    <tr><td>Additional Dog</td><td>$25.00</td></tr>
    <tr><td>Puppy (Under 1 Year)</td><td>$45.00</td></tr>
  </table>

  <table class="rates">
    <caption>Boarding at Sitter's House</caption>
    <tr><td>Overnight (24 hours)</td><td>$45.00</td></tr>
    <tr><td>Additional Dog</td><td>$30.00</td></tr>
    <tr><td>Puppy</td><td>$50.00</td></tr>
    <tr><td>Extended Rate (10+ nights)</td><td>$40.00</td></tr>
    <tr><td>Over 24 Hours (Additional Flat Fee)</td><td>$20.00</td></tr>
  </table>

  <table class="rates">
    <caption>Add-Ons</caption>
    <tr><td>Litter Box Cleaning</td><td>No Charge</td></tr>
    <tr><td>Medication Administration</td><td>No Charge</td></tr>
    <tr><td>Water Plants</td><td>No Charge</td></tr>
    <tr><td>Bring Mail/Packages In</td><td>No Charge</td></tr>
    <tr><td>Bring Trash Bins In</td><td>No Charge</td></tr>
  </table>

  <p>We tailor each visit to your pet's needs!</p>`;
}

function petProfilePage(title, nameLabel, lastSectionLabel, x) {
  const blankLine = '<span class="blank-line"></span>';
  const blankBlock = '____________________________________________________________';
  return `
  <div class="page">
    <h2 class="section-h">${title}</h2>
    <div class="field"><label>${nameLabel}:</label> ${x.petName || blankLine}</div>
    <div class="field"><label>Breed:</label> ${x.petBreed || blankLine}</div>
    <div class="field"><label>Age:</label> ${x.petAge || blankLine} &nbsp;&nbsp; <label>Weight:</label> ${x.petWeight || blankLine}</div>
    <div class="field"><label>Date of Last Vaccinations:</label> ${x.petVaccDate ? formatDate(x.petVaccDate) : blankLine}</div>
    <h3 class="sub-h">Feeding Instructions</h3>
    <p>${x.feeding || blankBlock}</p>
    <h3 class="sub-h">Medications</h3>
    <p>${x.medications || blankBlock}</p>
    <h3 class="sub-h">Allergies or Health Concerns</h3>
    <p>${x.petAllergies || blankBlock}</p>
    <h3 class="sub-h">Behavior Notes (shy, anxious, aggressive, etc.)</h3>
    <p>${x.petBehavior || blankBlock}</p>
    <h3 class="sub-h">Favorite Toys/Activities</h3>
    <p>${x.petFavorites || blankBlock}</p>
    <h3 class="sub-h">${lastSectionLabel}</h3>
    <div class="blank-block"></div>
  </div>`;
}

function buildContractHtml(d) {
  const serviceType = d.serviceType;
  const isDropIn = serviceType === 'Drop-In Visit';
  const isOvernight = serviceType === 'Overnight Stay';

  const dropInTimes = isDropIn ? String(d.startTime || '').split(',').map(t => t.trim()).filter(Boolean) : [];
  const visitCount = isDropIn ? Math.max(dropInTimes.length, 1) : 1;

  const nights = nightsBetween(d.startDate, d.endDate);
  let rate = RATE_INFO[serviceType]?.rate ?? 0;
  let unit = RATE_INFO[serviceType]?.unit ?? '';
  let dailyTotal = '';
  let visitTotal = '';

  if (isOvernight) {
    if (nights >= 10) rate = 40;
    dailyTotal = `$${rate.toFixed(2)}`;
    visitTotal = `$${(rate * nights).toFixed(2)}`;
  } else if (isDropIn) {
    visitTotal = `$${(rate * visitCount).toFixed(2)}`;
  }

  const dateRange = d.clientType === 'Ongoing'
    ? 'Ongoing &mdash; schedule based on availability'
    : (d.endDate && d.endDate !== d.startDate
      ? `${formatDate(d.startDate)} &ndash; ${formatDate(d.endDate)}`
      : formatDate(d.startDate));

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const blankLine = '<span class="blank-line"></span>';
  const petType = (d.petType || '').trim();
  const showDog = !petType || petType === 'Dog' || petType === 'Both';
  const showCat = !petType || petType === 'Cat' || petType === 'Both';

  const serviceTypeChecks = `${checkbox(isDropIn)} Drop-in &nbsp;&nbsp; ${checkbox(isOvernight)} Overnight &nbsp;&nbsp; ${checkbox(false)} Daycare &nbsp;&nbsp; ${checkbox(false)} Other: <span class="blank-line"></span>`;

  const dropOffPickup = isOvernight
    ? `<div class="field"><label>Drop-off Time:</label> ${formatTime(d.startTime)} &nbsp;&nbsp; <label>Pick-up Time:</label> ${formatTime(d.endTime)}</div>`
    : `<div class="field"><label>Drop-off Time:</label> <span class="blank-line"></span> &nbsp;&nbsp; <label>Pick-up Time:</label> <span class="blank-line"></span></div>`;

  const dropInTimeRow = isDropIn
    ? `<div class="field"><label>Drop-in Time(s):</label> ${formatTimesList(d.startTime)} &nbsp;&nbsp; <label>Length of Drop-in:</label> 30 minutes each</div>`
    : `<div class="field"><label>Drop-in Time(s):</label> <span class="blank-line"></span> &nbsp;&nbsp; <label>Length of Drop-in:</label> <span class="blank-line"></span></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Service Packet — ${d.ownerName}</title>
<style>${PACKET_STYLE}</style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>

  <div class="page cover">
    <img src="${LOGO_URL}" alt="Wags and Whiskers by Misti, LLC — Let us spoil your pets" />
  </div>

  <div class="page">
    <h2 class="section-h">Welcome Letter</h2>
    <p>Dear Pet Parent,</p>
    <p>Welcome to Wags and Whiskers by Misti, LLC!</p>
    <p>Thank you for trusting us to care for your beloved pet. We understand that your furry family members deserve love, attention, and dependable care when you're away. Our mission is to treat each pet as if they were our own &mdash; with gentle care, respect, and individualized attention.</p>
    <p>I have loved and owned animals as long as I can remember. I was raised with dogs, and other small animals! My daughter and I lost our Ollie in August 2022 at 4 years old to lung cancer and would love to care for your pet until we are ready for our next family member. I am comfortable taking care of pets of any age as well as administrating medications (including injectables).</p>
    <p>Whether it's daily walks, playtime, fresh meals, or snuggles while you're away, we're here to ensure your pet feels happy and secure.</p>
    <p>We're so excited to have you as part of the Wags and Whiskers by Misti, LLC family!</p>
    <p>Warmest wags and purrs,<br>Misti Anderson<br>Owner &amp; Pet Sitter<br>Wags and Whiskers by Misti, LLC</p>
  </div>

  <div class="page">
    <h2 class="section-h">Service Menu</h2>
    ${ratesTables()}
  </div>

  <div class="page">
    <h1 class="doc-title">Pet Sitting Contract</h1>
    <p class="doc-sub">Wags and Whiskers by Misti, LLC &mdash; "Let us spoil your pets"</p>

    <p>This agreement is entered into on <strong>${today}</strong>, by and between:</p>
    <div class="field"><label>Service Date(s):</label> ${dateRange}</div>

    <h3 class="sub-h">Pet Owner</h3>
    <div class="field"><label>Name:</label> ${d.ownerName}</div>
    <div class="field"><label>Address:</label> ${d.address}</div>
    <div class="field"><label>Phone:</label> ${d.ownerPhone} &nbsp;&nbsp; <label>Email:</label> ${d.ownerEmail}</div>

    <h3 class="sub-h">Pet Sitter / Walker (Service Provider)</h3>
    <div class="field">Wags and Whiskers by Misti, LLC, a Missouri limited liability company, by Misti Anderson, Managing Member</div>
    <div class="field"><label>Phone:</label> (816) 519-1012 &nbsp;&nbsp; <label>Email:</label> wagsandwhiskersbymistillc@gmail.com</div>

    <h3 class="sub-h">1. Dog(s)/Cat(s) Information</h3>
    <div class="field">${d.petInfo}</div>

    <h3 class="sub-h">2. Services Provided</h3>
    <div class="checks">
      <div>${checkbox(isDropIn)} Drop-in Visits (feeding, walks, litter box, medications, playtime, etc.)</div>
      <div>${checkbox(isOvernight)} Overnight at sitter's home (dogs only)</div>
      <div>${checkbox(false)} Day Care at sitter's home (dogs only)</div>
      <div>${checkbox(false)} Other: <span class="blank-line"></span></div>
    </div>

    <h3 class="sub-h">3. Payment</h3>
    <p>Due at end of visit or at last drop-in. Check or cash payment will be left at residence for drop-ins and held until the last drop-in.</p>
    <div class="field"><label>Rate per (visit/day):</label> $${rate.toFixed(2)} ${unit}</div>
    <div class="field"><label>Daily Total:</label> ${dailyTotal || '$__________'} &nbsp;&nbsp; <label>Visit Total:</label> ${visitTotal || '$__________'}</div>
    <div class="field"><label>Payment Due:</label> ☐ ____________ (date) &nbsp; ☑ At time of visit &nbsp; ☐ Weekly &nbsp; ☐ Biweekly &nbsp; ☐ Monthly</div>
    <div class="field"><label>Late Payment Fee:</label> $______ after ______ days</div>
    <div class="field"><label>Payment Methods:</label> Cash, Venmo, Cash App, Check</div>

    <h3 class="sub-h">4. Liability &amp; Safety</h3>
    <p>Wags and Whiskers by Misti, LLC is not liable for illness/injury unless negligent. Owner confirms dog vaccinations and behavior disclosures.</p>

    <h3 class="sub-h">5. Emergency Vet Care</h3>
    <p>In emergencies, the sitter will contact the owner, then the emergency contact if the owner is unavailable, provide care, and be reimbursed 100% of all care within 24 hours.</p>

    <h3 class="sub-h">6. Additional Notes</h3>
    <p>${d.notes || '____________________________________________________________'}</p>

    <h3 class="sub-h">7. Agreement &amp; Signatures</h3>
    <p>Valid until canceled in writing.</p>
    <div class="sign-block">
      <div class="field"><label>Owner Signature:</label> <span class="sign-line">&nbsp;</span> &nbsp;&nbsp; <label>Date:</label> ____________________</div>
    </div>
    <div class="sign-block">
      <div class="field">Wags and Whiskers by Misti, LLC, a Missouri limited liability company,</div>
      <div class="field"><label>By:</label> <span class="sign-line">&nbsp;</span> Misti Anderson, Managing Member &nbsp;&nbsp; <label>Date:</label> ____________________</div>
    </div>
  </div>

  <div class="page">
    <h2 class="section-h">Client Intake Form</h2>
    <h3 class="sub-h">Client Information</h3>
    <div class="field"><label>Name:</label> ${d.ownerName} &nbsp;&nbsp; <label>Phone:</label> ${d.ownerPhone}</div>
    <div class="field"><label>Alternate Phone:</label> ${d.altPhone || blankLine}</div>
    <div class="field"><label>Vet Name:</label> ${d.vetName || blankLine} &nbsp;&nbsp; <label>Vet Phone:</label> ${d.vetPhone || blankLine}</div>
    <div class="field"><label>Emergency Contact Name:</label> ${d.emergencyName || blankLine} &nbsp;&nbsp; <label>Phone:</label> ${d.emergencyPhone || blankLine}</div>

    <h3 class="sub-h">Service Preferences</h3>
    <div class="field">Days Needed: ${checkbox(false)} M &nbsp; ${checkbox(false)} T &nbsp; ${checkbox(false)} W &nbsp; ${checkbox(false)} Th &nbsp; ${checkbox(false)} F &nbsp; ${checkbox(false)} Sa &nbsp; ${checkbox(false)} Su</div>
    <div class="field"><label>Dates Needed:</label> ${dateRange}</div>
    <div class="field">Service Type: ${serviceTypeChecks}</div>
    ${dropOffPickup}
    ${dropInTimeRow}
    <div class="field"><label>Additional Instructions:</label> ${d.notes || blankLine}</div>

    <h3 class="sub-h">Household Info (Drop-Ins Only)</h3>
    <div class="field">Others in home during visits? ${checkbox(!!d.othersHome)} Yes &nbsp; ${checkbox(!d.othersHome)} No &nbsp; If yes: ${d.othersHome || blankLine}</div>
    <div class="field">Access Instructions: ${d.accessInstructions || blankLine}</div>
    <div class="field">Key Return: ${checkbox(d.keyReturn === 'After Final Visit')} After Final Visit &nbsp; ${checkbox(d.keyReturn === 'Retained')} Sitter Keeps a Copy &nbsp; ${checkbox(!d.keyReturn)} N/A</div>
    <div class="field">Restricted areas? ${checkbox(!!d.restrictedAreas)} Yes &nbsp; ${checkbox(!d.restrictedAreas)} No &nbsp; If yes: ${d.restrictedAreas || blankLine}</div>
  </div>

  ${showDog ? petProfilePage('Dog Profile Sheet (One Per Dog)', "Dog's Name", 'Additional Notes', d) : ''}
  ${showCat ? petProfilePage('Cat Profile Sheet (One Per Cat)', "Cat's Name", 'Anything Else We Should Know', d) : ''}

  <div class="page">
    <h2 class="section-h">Cancellation Policy</h2>
    <p>Cancellations made 5 or more days in advance will be refunded 100% of any money prepaid.</p>
    <p>Cancellations made 3 days in advance will be charged 50% of the total scheduled service fee.</p>
    <p>Cancellations made 24 hours or less in advance will be charged 100% of the total scheduled service fee.</p>
    <p>No-shows will be charged the full rate.</p>
    <p>Emergencies by the sitter will be communicated as soon as possible and alternate plans will be made as available.</p>
    <p>We understand that plans change and will do our best to work with you when possible.</p>
  </div>

  <div class="page">
    <h2 class="section-h">Client Agreement &amp; Signatures</h2>
    <p>By signing below, I acknowledge that I have reviewed and agree to the terms outlined in this service packet from Wags and Whiskers by Misti, LLC, including:</p>
    <ul>
      <li>Service offerings and rates</li>
      <li>Cancellation and refund policy</li>
      <li>Access and emergency procedures</li>
    </ul>
    <p>I understand that Wags and Whiskers by Misti, LLC will make every reasonable effort to care for my pet(s) safely and responsibly. I agree to inform the sitter of any changes to my pet's health, behavior, or care needs.</p>

    <div class="sign-block">
      <div class="field"><label>Client Name:</label> ${d.ownerName}</div>
      <div class="field"><label>Signature:</label> <span class="sign-line">&nbsp;</span> &nbsp;&nbsp; <label>Date:</label> ____________________</div>
    </div>

    <div class="sign-block">
      <div class="field">Wags and Whiskers by Misti, LLC, a Missouri limited liability company,</div>
      <div class="field"><label>By:</label> <span class="sign-line">&nbsp;</span> Misti Anderson, Managing Member &nbsp;&nbsp; <label>Date:</label> ____________________</div>
    </div>
  </div>

  <div class="page">
    <h2 class="section-h">Thank You!</h2>
    <p>We're so grateful to have you as a client of Wags and Whiskers by Misti, LLC.</p>
    <p>Every tail wag and happy purr reminds us why we do what we do &mdash; provide loving, professional pet care you can rely on.</p>
    <p>If you were happy with our service, the best way to thank us is by telling a friend or leaving a review!</p>
    <p>From our pack to yours, thank you for supporting a local small business.</p>
    <p>With gratitude,<br>Wags and Whiskers by Misti, LLC<br>"Let us spoil your pets"</p>
  </div>
</body>
</html>`;
}

const bookingStatus = document.getElementById('bookingStatus');

function showBookingStatus(message, type) {
  bookingStatus.textContent = message;
  bookingStatus.className = `booking-status ${type}`;
  bookingStatus.hidden = false;
}

bookingForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  bookingStatus.hidden = true;

  if (addressOutOfRange) {
    showBookingStatus(`Sorry, your address is outside our ${MAX_SERVICE_MILES}-mile service area. Please contact us directly to discuss options.`, 'error');
    return;
  }

  const data = new FormData(bookingForm);
  const d = Object.fromEntries(data.entries());
  const ongoing = d.clientType === 'Ongoing';

  if (ongoing) {
    d.startDate = todayISO();
    d.endDate = '';
    d.startTime = '';
  } else if (DROP_IN_SERVICES.has(d.serviceType)) {
    if (selectedSlots.size === 0) {
      showBookingStatus('Please choose at least one time slot for your visit.', 'error');
      return;
    }
    d.startTime = [...selectedSlots].sort().join(',');
  }

  // Reserve the request with the booking system first — for overnight/day
  // care this checks the dates are still available before we proceed.
  try {
    const res = await fetch(`${BOOKING_API}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showBookingStatus(err.error || 'Something went wrong submitting your request. Please try again.', 'error');
      return;
    }
    renderCalendar();
    if (DROP_IN_SERVICES.has(d.serviceType)) {
      selectedSlots.clear();
      renderTimeSlots();
    }
  } catch (err) {
    // booking server unreachable — fall back to email-only flow
  }

  const subject = `Booking Request: ${d.serviceType} - ${d.ownerName}`;
  const lines = [
    `Name: ${d.ownerName}`,
    `Email: ${d.ownerEmail}`,
    `Phone: ${d.ownerPhone || 'N/A'}`,
    `Service Type: ${d.serviceType}`,
    `Booking Type: ${d.clientType === 'Ongoing' ? 'Ongoing / recurring (schedule based on availability)' : 'One-time'}`,
    `Start Date: ${d.clientType === 'Ongoing' ? 'N/A — ongoing client' : d.startDate}`,
    `End Date: ${d.endDate || 'N/A'}`,
    `Preferred Time: ${d.startTime || 'N/A'}`,
    `Pet(s) Info: ${d.petInfo}`,
    `Address: ${d.address}`,
    `Notes: ${d.notes || 'N/A'}`,
    `Emergency Contact: ${d.emergencyName || 'N/A'} ${d.emergencyPhone || ''}`.trim(),
    `Vet: ${d.vetName || 'N/A'} ${d.vetPhone || ''}`.trim(),
  ];
  const body = lines.join('\n');
  const mailtoLink = `mailto:wagsandwhiskersbymistillc@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  // Open the pre-filled, printable contract in a new tab
  const contractWin = window.open('', '_blank');
  if (contractWin) {
    contractWin.document.write(buildContractHtml(d));
    contractWin.document.close();
  }

  showBookingStatus('Request received! Opening your email and contract now...', 'success');
  window.location.href = mailtoLink;
});

// ── Footer year ─────────────────────────────────────────────────────────────
document.getElementById('year').textContent = new Date().getFullYear();
