// ── Nav links (now inside hero) ─────────────────────────────────────────────
const navLinks = document.querySelector('.nav-links');

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

  // Overnight/Day Care bookings take up Misti's whole day, but a Drop-In
  // visit or walk only needs a short time slot, so those days still show
  // as available when Drop-In is the selected service.
  const serviceType = document.getElementById('serviceType').value;
  const isDropIn = DROP_IN_SERVICES.has(serviceType);

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
    cell.dataset.date = dateStr;
    if (dateStr === todayStr) cell.classList.add('cal-today');
    const unavailableForService = blockedSet.has(dateStr) || (bookedSet.has(dateStr) && !isDropIn);
    if (unavailableForService) cell.classList.add('cal-unavailable');
    else cell.classList.add('cal-available');
    cell.textContent = day;
    if (!unavailableForService) {
      cell.addEventListener('click', () => openDayDetail(dateStr));
    }
    calEl.appendChild(cell);
  }
}

// ── Day detail modal ────────────────────────────────────────────────────────
const dayDetailModal = document.getElementById('dayDetailModal');
const dayDetailModalClose = document.getElementById('dayDetailModalClose');
const dayDetailTitle = document.getElementById('dayDetailTitle');
const dayDetailSlots = document.getElementById('dayDetailSlots');

function openDayDetailModal() {
  dayDetailModal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeDayDetailModal() {
  dayDetailModal.hidden = true;
  document.body.style.overflow = '';
}

dayDetailModalClose.addEventListener('click', closeDayDetailModal);
dayDetailModal.addEventListener('click', (e) => {
  if (e.target === dayDetailModal) closeDayDetailModal();
});

async function openDayDetail(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  dayDetailTitle.textContent = new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  dayDetailSlots.innerHTML = '<p class="slots-loading">Loading times…</p>';
  openDayDetailModal();

  try {
    const res = await fetch(`${BOOKING_API}/api/availability/slots?date=${dateStr}`);
    if (!res.ok) throw new Error('bad response');
    const data = await res.json();
    dayDetailSlots.innerHTML = '';
    (data.slots || []).forEach(s => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `slot-btn ${s.available ? 'slot-available' : 'slot-booked'}`;
      btn.textContent = formatTime(s.time);
      btn.disabled = true;
      dayDetailSlots.appendChild(btn);
    });
  } catch (err) {
    dayDetailSlots.innerHTML = '<p class="slots-error">Could not load times — please try again.</p>';
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

// ── Add Pet Profile (multi-pet bookings) ────────────────────────────────
const PET_PROFILE_FIELDS = [
  'petName', 'petType', 'petBreed', 'petAge', 'petWeight', 'petVaccDate',
  'feeding', 'medications', 'petAllergies', 'petBehavior', 'petFavorites',
];

const petProfilesContainer = document.getElementById('petProfiles');
const addPetBtn = document.getElementById('addPetBtn');
let petProfileCount = 1;

addPetBtn.addEventListener('click', () => {
  petProfileCount++;
  const index = petProfileCount;
  const template = petProfilesContainer.children[0];
  const block = template.cloneNode(true);
  block.dataset.petIndex = index;

  block.querySelectorAll('[id]').forEach(el => { el.id = `${el.id}_${index}`; });
  block.querySelectorAll('label[for]').forEach(label => {
    label.setAttribute('for', `${label.getAttribute('for')}_${index}`);
  });
  block.querySelectorAll('input, textarea, select').forEach(el => {
    el.name = `${el.name}_${index}`;
    if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else el.value = '';
  });

  const heading = document.createElement('h4');
  heading.className = 'pet-profile-heading';
  heading.textContent = `Pet #${index}`;
  block.insertBefore(heading, block.firstChild);

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn btn-outline remove-pet-btn';
  removeBtn.textContent = 'Remove This Pet';
  removeBtn.addEventListener('click', () => block.remove());
  block.appendChild(removeBtn);

  petProfilesContainer.appendChild(block);
});

// Gathers the additional pet profiles (index 2+) as an array of field
// objects, for inclusion in the booking payload alongside the primary
// pet's top-level petName/petType/etc fields.
function collectAdditionalPets() {
  const blocks = [...petProfilesContainer.children].slice(1);
  return blocks.map(block => {
    const pet = {};
    for (const field of PET_PROFILE_FIELDS) {
      const el = block.querySelector(`[name^="${field}_"]`);
      if (el) pet[field] = el.value;
    }
    return pet;
  });
}

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
  const isDayCare = serviceType === 'Day Care';

  if (isOvernight || isDayCare) {
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
  renderCalendar();
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
  'Day Care':                  { rate: 40, unit: 'per day' },
};

// ── Distance-based drop-in pricing ──────────────────────────────────────────
const DROP_IN_RATES = { near: 16, far: 18 };
const DROP_IN_EXTENDED_RATES = { near: 15, far: 17 }; // 14+ visits / ongoing recurring clients
const PUPPY_ADDON = 4; // drop-in puppy add-on
const OVERNIGHT_PUPPY_RATE = 50;
const OVERNIGHT_OVER_24H_FEE = 20;
const MAX_SERVICE_MILES = 10;

// Pet Profile "Age" is free text (e.g. "8 weeks", "5 months", "2", "3 years") —
// treat anything under 1 year old as a puppy/kitten for pricing.
function isPuppyAge(ageText) {
  const text = String(ageText || '').toLowerCase().trim();
  if (!text) return false;
  if (text.includes('puppy') || text.includes('kitten')) return true;
  const match = text.match(/(\d+(?:\.\d+)?)/);
  if (!match) return false;
  const num = parseFloat(match[1]);
  if (text.includes('week')) return true;
  if (text.includes('month')) return num < 12;
  return num < 1; // bare number or "years"/"yr" — assume years
}

// Overnight stays beyond full 24-hour blocks (drop-off time earlier in the
// day than pick-up time) incur a flat over-24-hour fee.
function overnightExtraHours(d, nights) {
  if (!d.startTime || !d.endTime || !d.startDate || !d.endDate) return 0;
  const start = new Date(`${d.startDate}T${d.startTime}:00`);
  const end = new Date(`${d.endDate}T${d.endTime}:00`);
  const totalHours = (end - start) / 3600000;
  const extra = totalHours - nights * 24;
  return extra > 0.01 ? extra : 0;
}

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
  const isDayCare = serviceType === 'Day Care';

  const dropInTimes = isDropIn ? String(d.startTime || '').split(',').map(t => t.trim()).filter(Boolean) : [];
  const visitCount = isDropIn ? Math.max(dropInTimes.length, 1) : 1;

  const nights = nightsBetween(d.startDate, d.endDate);
  const isPuppy = isPuppyAge(d.petAge);
  let rate = RATE_INFO[serviceType]?.rate ?? 0;
  let unit = RATE_INFO[serviceType]?.unit ?? '';
  let dailyTotal = '';
  let visitTotal = '';
  let visitTotalNote = '';

  if (isOvernight) {
    if (nights >= 10) {
      rate = 40;
      unit = 'per night (extended rate, 10+ nights)';
    } else if (isPuppy) {
      rate = OVERNIGHT_PUPPY_RATE;
      unit = 'per night (puppy)';
    }
    const over24Fee = overnightExtraHours(d, nights) > 0 ? OVERNIGHT_OVER_24H_FEE : 0;
    dailyTotal = `$${rate.toFixed(2)}`;
    visitTotal = `$${(rate * nights + over24Fee).toFixed(2)}`;
    if (over24Fee) visitTotalNote = ` (incl. $${over24Fee.toFixed(2)} over-24-hour fee)`;
  } else if (isDayCare) {
    if (isPuppy) {
      rate = 45;
      unit = 'per day (puppy)';
    }
    const days = (d.endDate && d.endDate !== d.startDate) ? nights + 1 : 1;
    dailyTotal = `$${rate.toFixed(2)}`;
    visitTotal = `$${(rate * days).toFixed(2)}`;
  } else if (isDropIn) {
    const isFar = parseFloat(d.distanceMiles) >= 5;
    const daySpan = (d.endDate && d.endDate !== d.startDate) ? nights + 1 : 1;
    const totalVisits = visitCount * daySpan;
    const extended = totalVisits >= 14;
    const rates = extended ? DROP_IN_EXTENDED_RATES : DROP_IN_RATES;
    rate = (isFar ? rates.far : rates.near) + (isPuppy ? PUPPY_ADDON : 0);
    unit = `per visit (30 min, ${isFar ? '5+' : 'under 5'} mi from Misti's home${extended ? ', extended rate (14+ visits in this request)' : ''}${isPuppy ? ' + puppy add-on' : ''})`;
    dailyTotal = daySpan > 1 ? `$${(rate * visitCount).toFixed(2)}` : '';
    visitTotal = `$${(rate * totalVisits).toFixed(2)}`;
  }

  const dateRange = d.clientType === 'Ongoing'
    ? 'Ongoing &mdash; schedule based on availability'
    : (d.endDate && d.endDate !== d.startDate
      ? `${formatDate(d.startDate)} &ndash; ${formatDate(d.endDate)}`
      : formatDate(d.startDate));

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const blankLine = '<span class="blank-line"></span>';

  let extraPets = [];
  try { extraPets = JSON.parse(d.pets || '[]'); } catch { extraPets = []; }
  const allPets = [d, ...(Array.isArray(extraPets) ? extraPets : [])];

  const serviceTypeChecks = `${checkbox(isDropIn)} Drop-in &nbsp;&nbsp; ${checkbox(isOvernight)} Overnight &nbsp;&nbsp; ${checkbox(isDayCare)} Daycare &nbsp;&nbsp; ${checkbox(false)} Other: <span class="blank-line"></span>`;

  const dropOffPickup = (isOvernight || isDayCare)
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
      <div>${checkbox(isDayCare)} Day Care at sitter's home (dogs only)</div>
      <div>${checkbox(false)} Other: <span class="blank-line"></span></div>
    </div>

    <h3 class="sub-h">3. Payment</h3>
    <p>Due at end of visit or at last drop-in. Check or cash payment will be left at residence for drop-ins and held until the last drop-in.</p>
    <div class="field"><label>Rate per (visit/day):</label> $${rate.toFixed(2)} ${unit}</div>
    <div class="field"><label>Daily Total:</label> ${dailyTotal || '$__________'} &nbsp;&nbsp; <label>Visit Total:</label> ${visitTotal || '$__________'}${visitTotalNote}</div>
    <div class="field"><label>Payment Due:</label> ☐ ____________ (date) &nbsp; ☑ At time of visit &nbsp; ☐ Weekly &nbsp; ☐ Biweekly &nbsp; ☐ Monthly</div>
    <div class="field"><label>Late Payment Fee:</label> $______ after ______ days</div>
    <div class="field"><label>Payment Methods:</label> Cash, Venmo, Cash App, Check</div>

    <h3 class="sub-h">4. Liability &amp; Safety</h3>
    <p>Wags and Whiskers by Misti, LLC is not liable for illness/injury unless negligent. Owner confirms dog vaccinations and behavior disclosures.</p>

    <h3 class="sub-h">5. Emergency Vet Care</h3>
    <p>In emergencies, the sitter will contact the owner, then the emergency contact if the owner is unavailable, provide care, and be reimbursed 100% of all care within 24 hours.</p>

    <h3 class="sub-h">6. Additional Notes</h3>
    <p>${d.notes || '____________________________________________________________'}</p>

    <h3 class="sub-h">7. Agreement</h3>
    <p>Valid until canceled in writing.</p>
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
    <div class="field">Access Type: ${checkbox(d.accessType === 'Key')} Key &nbsp; ${checkbox(d.accessType === 'Code')} Code &nbsp; ${checkbox(d.accessType === 'Other')} Other</div>
    <div class="field">Access Instructions: ${d.accessInstructions || blankLine}</div>
    <div class="field">Key Return: ${checkbox(d.keyReturn === 'After Final Visit')} After Final Visit &nbsp; ${checkbox(d.keyReturn === 'Retained')} Sitter Keeps a Copy &nbsp; ${checkbox(!d.keyReturn)} N/A</div>
    <div class="field">Restricted areas? ${checkbox(!!d.restrictedAreas)} Yes &nbsp; ${checkbox(!d.restrictedAreas)} No &nbsp; If yes: ${d.restrictedAreas || blankLine}</div>
  </div>

  ${allPets.map(pet => {
    const petType = (pet.petType || '').trim();
    const petShowDog = !petType || petType === 'Dog' || petType === 'Both';
    const petShowCat = !petType || petType === 'Cat' || petType === 'Both';
    return `
      ${petShowDog ? petProfilePage('Dog Profile Sheet (One Per Dog)', "Dog's Name", 'Additional Notes', pet) : ''}
      ${petShowCat ? petProfilePage('Cat Profile Sheet (One Per Cat)', "Cat's Name", 'Anything Else We Should Know', pet) : ''}
    `;
  }).join('')}

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

  const additionalPets = collectAdditionalPets();
  if (additionalPets.length) d.pets = JSON.stringify(additionalPets);

  // petInfo is no longer a separate field — build it from the pet profile(s).
  const petSummary = (name, type, breed, age) =>
    [name, type, breed, age].filter(Boolean).join(', ');
  const petSummaries = [petSummary(d.petName, d.petType, d.petBreed, d.petAge)];
  for (const pet of additionalPets) {
    petSummaries.push(petSummary(pet.petName, pet.petType, pet.petBreed, pet.petAge));
  }
  d.petInfo = petSummaries.filter(Boolean).join('; ');
  // Drop the raw per-pet field copies (petName_2, petType_2, ...) — they're
  // already captured in d.pets above.
  for (const key of Object.keys(d)) {
    if (/_\d+$/.test(key)) delete d[key];
  }

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
    const { id: bookingId } = await res.json();

    const photoFiles = document.getElementById('petPhotos').files;
    if (bookingId && photoFiles.length > 0) {
      const photoData = new FormData();
      for (const file of photoFiles) photoData.append('photos', file);
      try {
        await fetch(`${BOOKING_API}/api/bookings/${bookingId}/photos`, { method: 'POST', body: photoData });
      } catch (err) {
        // photo upload failure shouldn't block the booking request
      }
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
    `Photo/Review Consent: ${d.photoConsent ? 'Yes' : 'No'}`,
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

// ── Booking modal ────────────────────────────────────────────────────────────
const bookingModal = document.getElementById('bookingModal');
const bookingModalClose = document.getElementById('bookingModalClose');

function openBookingModal() {
  bookingModal.hidden = false;
  document.body.style.overflow = 'hidden';
  showBookingTab('schedule');
}

function closeBookingModal() {
  bookingModal.hidden = true;
  document.body.style.overflow = '';
}

bookingModalClose.addEventListener('click', closeBookingModal);
bookingModal.addEventListener('click', (e) => {
  if (e.target === bookingModal) closeBookingModal();
});

for (const id of ['heroBookBtn', 'navBookBtn']) {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navLinks.classList.remove('open');
      openBookingModal();
    });
  }
}

// ── Booking form tabs ───────────────────────────────────────────────────────
const bookingTabs = document.querySelectorAll('.booking-tab');
const bookingTabContents = document.querySelectorAll('.booking-tab-content');
const bookingTabsTrack = document.querySelector('.booking-tabs-track');
const bookingTabOrder = ['schedule', 'details', 'emergency', 'pets', 'access'];

function showBookingTab(name) {
  const index = bookingTabOrder.indexOf(name);
  bookingTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.bookingTab === name));
  bookingTabContents.forEach(content => {
    content.toggleAttribute('inert', content.dataset.bookingTabContent !== name);
  });
  bookingTabsTrack.style.transform = `translateX(-${index * 100}%)`;
}

bookingTabs.forEach(tab => {
  tab.addEventListener('click', () => showBookingTab(tab.dataset.bookingTab));
});

document.querySelectorAll('.booking-next').forEach(btn => {
  btn.addEventListener('click', () => {
    const current = document.querySelector('.booking-tab.active').dataset.bookingTab;
    const next = bookingTabOrder[bookingTabOrder.indexOf(current) + 1];
    if (next) {
      showBookingTab(next);
      const modalBox = document.querySelector('#bookingModal .modal-box');
      if (modalBox) modalBox.scrollTop = 0;
    }
  });
});

document.querySelectorAll('.booking-prev').forEach(btn => {
  btn.addEventListener('click', () => {
    const current = document.querySelector('.booking-tab.active').dataset.bookingTab;
    const prev = bookingTabOrder[bookingTabOrder.indexOf(current) - 1];
    if (prev) showBookingTab(prev);
  });
});

// ── Rates modal ──────────────────────────────────────────────────────────────
const ratesModal = document.getElementById('ratesModal');
const ratesModalClose = document.getElementById('ratesModalClose');
const ratesNavBtn = document.getElementById('ratesNavBtn');

function openRatesModal() {
  ratesModal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeRatesModal() {
  ratesModal.hidden = true;
  document.body.style.overflow = '';
}

ratesModalClose.addEventListener('click', closeRatesModal);
ratesModal.addEventListener('click', (e) => {
  if (e.target === ratesModal) closeRatesModal();
});

ratesNavBtn.addEventListener('click', (e) => {
  e.preventDefault();
  navLinks.classList.remove('open');
  openRatesModal();
});

// ── Returning-client sign-in / Welcome Back portal ──────────────────────────
const petSignInForm = document.getElementById('petSignInForm');
const signInStatus = document.getElementById('petSignInStatus');
const petSignInModal = document.getElementById('petSignInModal');
const petSignInModalClose = document.getElementById('petSignInModalClose');
const signInBtn = document.getElementById('signInBtn');
const newClientBtn = document.getElementById('newClientBtn');
const welcomeModal = document.getElementById('welcomeModal');
const welcomeModalClose = document.getElementById('welcomeModalClose');
const welcomeTitle = document.getElementById('welcomeTitle');
const welcomeSince = document.getElementById('welcomeSince');
const portalOverviewBody = document.getElementById('portalOverviewBody');
const portalBookingsBody = document.getElementById('portalBookingsBody');
const editProfileBtn = document.getElementById('editProfileBtn');
const editProfileActions = document.getElementById('editProfileActions');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const cancelEditProfileBtn = document.getElementById('cancelEditProfileBtn');
const editProfileStatus = document.getElementById('editProfileStatus');

function openWelcomeModal() {
  welcomeModal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeWelcomeModal() {
  welcomeModal.hidden = true;
  document.body.style.overflow = '';
}

welcomeModalClose.addEventListener('click', closeWelcomeModal);
welcomeModal.addEventListener('click', (e) => {
  if (e.target === welcomeModal) closeWelcomeModal();
});

function showSignInStatus(message) {
  signInStatus.textContent = message;
  signInStatus.hidden = !message;
}

function formatClientSince(unixSeconds) {
  if (!unixSeconds) return '';
  const since = new Date(unixSeconds * 1000);
  const now = new Date();
  let months = (now.getFullYear() - since.getFullYear()) * 12 + (now.getMonth() - since.getMonth());
  if (now.getDate() < since.getDate()) months--;
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  const parts = [];
  if (years) parts.push(`${years} year${years === 1 ? '' : 's'}`);
  if (remMonths || !years) parts.push(`${remMonths} month${remMonths === 1 ? '' : 's'}`);
  const dateLabel = since.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return `Client since ${dateLabel} — that's ${parts.join(', ')}! 🐾`;
}

let currentPortalData = null;

const PROFILE_FIELDS = [
  ['ownerName', 'Name', 'text'],
  ['ownerEmail', 'Email', 'email'],
  ['ownerPhone', 'Phone', 'tel'],
  ['address', 'Address', 'text'],
  ['petInfo', 'Pet(s)', 'text'],
];

let isEditingProfile = false;

function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Section titles matching this pattern hold admin-locked rate/contract
// terms and cannot be edited from the client portal.
const LOCKED_SECTION_RE = /contract|rate|fee/i;

function renderSectionValue(value) {
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .filter(([, v]) => v)
      .map(([label, v]) => `<div class="portal-booking-row"><span>${label}</span><span>${v}</span></div>`)
      .join('');
  }
  return `<p>${value}</p>`;
}

function renderSectionEditFields(sectionTitle, value) {
  if (!value || typeof value !== 'object') return '';
  return Object.entries(value)
    .map(([label, v]) => `<div class="portal-booking-row portal-edit-row"><span>${label}</span><input type="text" data-section="${escapeAttr(sectionTitle)}" data-field="${escapeAttr(label)}" value="${escapeAttr(v)}" /></div>`)
    .join('');
}

let activeOverviewSection = 'Your Information';

function renderOverviewBody() {
  const data = currentPortalData;
  const sections = data.sections || {};
  const sectionKeys = ['Your Information', ...Object.keys(sections).filter((k) => sections[k])];

  if (!sectionKeys.includes(activeOverviewSection)) {
    activeOverviewSection = 'Your Information';
  }
  const activeKey = activeOverviewSection;
  const isLockedSection = activeKey !== 'Your Information' && LOCKED_SECTION_RE.test(activeKey);

  let tabsHtml = '';
  if (!isEditingProfile && sectionKeys.length > 1) {
    tabsHtml = '<div class="overview-sub-tabs">' + sectionKeys.map((key) =>
      `<button type="button" class="overview-sub-tab${key === activeKey ? ' active' : ''}" data-section="${escapeAttr(key)}">${key}</button>`
    ).join('') + '</div>';
  }

  let contentHtml;
  if (activeKey === 'Your Information') {
    contentHtml = '<div class="portal-section"><h4>Your Information</h4>';
    for (const [key, label, type] of PROFILE_FIELDS) {
      const value = data[key] || '';
      if (!value && !isEditingProfile) continue;
      if (isEditingProfile) {
        contentHtml += `<div class="portal-booking-row portal-edit-row"><span>${label}</span><input type="${type}" data-field="${key}" value="${escapeAttr(value)}" /></div>`;
      } else {
        contentHtml += `<div class="portal-booking-row"><span>${label}</span><span>${value}</span></div>`;
      }
    }
    contentHtml += '</div>';
  } else if (isEditingProfile && !isLockedSection) {
    contentHtml = `<div class="portal-section"><h4>${activeKey}</h4>${renderSectionEditFields(activeKey, sections[activeKey])}</div>`;
    if (isPetProfileSection(activeKey)) contentHtml += renderPhotosHtml();
  } else {
    contentHtml = `<div class="portal-section"><h4>${activeKey}</h4>${renderSectionValue(sections[activeKey])}</div>`;
    if (isPetProfileSection(activeKey)) contentHtml += renderPhotosHtml();
  }

  portalOverviewBody.innerHTML = tabsHtml + contentHtml;
  editProfileBtn.hidden = isEditingProfile || isLockedSection;
}

function isPetProfileSection(sectionTitle) {
  return /dog profile|pet profile|cat profile/i.test(sectionTitle);
}

function renderPhotosHtml() {
  const data = currentPortalData;
  if (!data.clientId) return '';
  const photos = data.photos || [];
  const limit = data.photoLimit || 2;
  const photosHtml = photos.map((p) => `
    <div class="portal-photo">
      <img src="${BOOKING_API}/uploads/${p}" alt="Pet photo" />
      <button type="button" class="portal-photo-remove" data-path="${escapeAttr(p)}">&times;</button>
    </div>
  `).join('');
  const addHtml = photos.length < limit
    ? `<label class="portal-photo-add">+<input type="file" accept="image/*" multiple hidden id="portalPhotoInput" /></label>`
    : '';
  return `
    <div class="portal-section">
      <h4>Pet Photos</h4>
      <div class="portal-photos">${photosHtml}${addHtml}</div>
      <p id="portalPhotoStatus" class="booking-status" hidden></p>
    </div>
  `;
}

async function uploadClientPhotos(files) {
  if (!files || !files.length || !currentPortalData?.clientId) return;
  const formData = new FormData();
  for (const file of files) formData.append('photos', file);
  const status = document.getElementById('portalPhotoStatus');
  if (status) { status.textContent = 'Uploading...'; status.hidden = false; }
  try {
    const res = await fetch(`${BOOKING_API}/api/client-portal/${currentPortalData.clientId}/photos`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('bad response');
    const result = await res.json();
    currentPortalData.photos = result.photos;
    if (result.limit) currentPortalData.photoLimit = result.limit;
    renderOverviewBody();
  } catch {
    if (status) { status.textContent = 'Upload failed — please try again.'; status.hidden = false; }
  }
}

async function removeClientPhoto(path) {
  if (!currentPortalData?.clientId) return;
  try {
    const res = await fetch(`${BOOKING_API}/api/client-portal/${currentPortalData.clientId}/photos`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    if (!res.ok) throw new Error('bad response');
    const result = await res.json();
    currentPortalData.photos = result.photos;
    renderOverviewBody();
  } catch {}
}

portalOverviewBody.addEventListener('click', (e) => {
  const tabBtn = e.target.closest('.overview-sub-tab');
  if (tabBtn) {
    activeOverviewSection = tabBtn.dataset.section;
    renderOverviewBody();
    return;
  }
  const removeBtn = e.target.closest('.portal-photo-remove');
  if (removeBtn) {
    removeClientPhoto(removeBtn.dataset.path);
  }
});

portalOverviewBody.addEventListener('change', (e) => {
  if (e.target.id === 'portalPhotoInput') {
    uploadClientPhotos(e.target.files);
  }
});

function renderPortalOverview(data) {
  currentPortalData = data;
  isEditingProfile = false;
  activeOverviewSection = 'Your Information';
  editProfileActions.hidden = true;
  showEditProfileStatus('');
  renderOverviewBody();
}

function renderPortalBookings(bookings) {
  if (!bookings || !bookings.length) {
    portalBookingsBody.innerHTML = '<p>No past bookings yet.</p>';
    return;
  }
  portalBookingsBody.innerHTML = bookings.map(b => {
    const dates = b.end_date && b.end_date !== b.start_date
      ? `${formatDate(b.start_date)} – ${formatDate(b.end_date)}`
      : formatDate(b.start_date);
    return `
      <div class="portal-booking-row">
        <span><strong>${b.service_type}</strong><br />${dates}</span>
        <span class="portal-status portal-status-${b.status}">${b.status}</span>
      </div>
    `;
  }).join('');
}

function showEditProfileStatus(message) {
  editProfileStatus.textContent = message;
  editProfileStatus.hidden = !message;
}

editProfileBtn.addEventListener('click', () => {
  if (!currentPortalData) return;
  isEditingProfile = true;
  showEditProfileStatus('');
  editProfileActions.hidden = false;
  renderOverviewBody();
});

cancelEditProfileBtn.addEventListener('click', () => {
  isEditingProfile = false;
  showEditProfileStatus('');
  editProfileActions.hidden = true;
  renderOverviewBody();
});

saveProfileBtn.addEventListener('click', async () => {
  if (!currentPortalData) return;

  const updates = { clientId: currentPortalData.clientId };
  const sectionUpdates = {};
  portalOverviewBody.querySelectorAll('[data-field]').forEach((input) => {
    const section = input.dataset.section;
    if (section) {
      sectionUpdates[section] = sectionUpdates[section] || {};
      sectionUpdates[section][input.dataset.field] = input.value.trim();
    } else {
      updates[input.dataset.field] = input.value.trim();
    }
  });
  if (Object.keys(sectionUpdates).length) updates.sections = sectionUpdates;

  showEditProfileStatus('Saving...');
  try {
    const res = await fetch(`${BOOKING_API}/api/client-portal`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('bad response');
    const result = await res.json();

    currentPortalData = {
      ...currentPortalData,
      ...updates,
      clientId: result.clientId ?? currentPortalData.clientId,
    };

    if (Object.keys(sectionUpdates).length) {
      const mergedSections = { ...(currentPortalData.sections || {}) };
      for (const [title, fields] of Object.entries(sectionUpdates)) {
        mergedSections[title] = { ...(mergedSections[title] || {}), ...fields };
      }
      currentPortalData.sections = mergedSections;
    }

    reviewOwnerName = currentPortalData.ownerName;
    reviewOwnerEmail = currentPortalData.ownerEmail;
    reviewOwnerPhone = currentPortalData.ownerPhone;

    const firstName = (currentPortalData.ownerName || '').split(' ')[0] || 'there';
    welcomeTitle.textContent = `Welcome Back, ${firstName}! 🐾`;

    isEditingProfile = false;
    editProfileActions.hidden = true;
    showEditProfileStatus('');
    renderOverviewBody();
  } catch {
    showEditProfileStatus('Something went wrong — please try again.');
  }
});

function openPetSignInModal() {
  petSignInModal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closePetSignInModal() {
  petSignInModal.hidden = true;
  document.body.style.overflow = '';
}

signInBtn.addEventListener('click', () => {
  showSignInStatus('');
  openPetSignInModal();
});

newClientBtn.addEventListener('click', () => {
  openBookingModal();
});

petSignInModalClose.addEventListener('click', closePetSignInModal);
petSignInModal.addEventListener('click', (e) => {
  if (e.target === petSignInModal) closePetSignInModal();
});

petSignInForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const petName = document.getElementById('signInPetName').value.trim();
  const phone = document.getElementById('signInPhone').value.trim();
  if (!petName || !phone) return;

  showSignInStatus('Looking you up...');
  try {
    const res = await fetch(`${BOOKING_API}/api/client-portal?petName=${encodeURIComponent(petName)}&phone=${encodeURIComponent(phone)}`);
    const data = await res.json();
    if (!data.found) {
      showSignInStatus("We couldn't find an account with that pet name and phone.");
      return;
    }

    showSignInStatus('');
    const firstName = (data.ownerName || '').split(' ')[0] || 'there';
    welcomeTitle.textContent = `Welcome Back, ${firstName}! 🐾`;
    welcomeSince.textContent = formatClientSince(data.clientSince);

    renderPortalOverview(data);
    renderPortalBookings(data.bookings);

    reviewOwnerName = data.ownerName || '';
    reviewOwnerEmail = data.ownerEmail || '';
    reviewOwnerPhone = data.ownerPhone || '';

    switchClientTab('overview');
    closePetSignInModal();
    openWelcomeModal();
  } catch {
    showSignInStatus('Something went wrong — please try again.');
  }
});

// ── Welcome modal tabs ───────────────────────────────────────────────────────
const clientTabs = document.querySelectorAll('.client-tab');
const clientTabContents = {
  overview: document.getElementById('portalTabOverview'),
  bookings: document.getElementById('portalTabBookings'),
  review: document.getElementById('portalTabReview'),
};

function switchClientTab(name) {
  clientTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === name));
  for (const [key, el] of Object.entries(clientTabContents)) {
    el.hidden = key !== name;
  }
}

clientTabs.forEach(tab => tab.addEventListener('click', () => switchClientTab(tab.dataset.tab)));

// ── Leave a Review ───────────────────────────────────────────────────────────
let reviewOwnerName = '';
let reviewOwnerEmail = '';
let reviewOwnerPhone = '';

const reviewStars = document.querySelectorAll('.review-star');
const reviewRatingInput = document.getElementById('reviewRating');
const reviewForm = document.getElementById('reviewForm');
const reviewStatus = document.getElementById('reviewStatus');

reviewStars.forEach(star => {
  star.addEventListener('click', () => {
    const value = Number(star.dataset.value);
    reviewRatingInput.value = value;
    reviewStars.forEach(s => s.classList.toggle('selected', Number(s.dataset.value) <= value));
  });
});

reviewForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const rating = Number(reviewRatingInput.value);
  const text = document.getElementById('reviewText').value.trim();

  if (!rating) {
    reviewStatus.textContent = 'Please select a star rating.';
    reviewStatus.hidden = false;
    return;
  }

  reviewStatus.textContent = 'Submitting...';
  reviewStatus.hidden = false;

  try {
    const res = await fetch(`${BOOKING_API}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ownerName: reviewOwnerName,
        ownerEmail: reviewOwnerEmail,
        ownerPhone: reviewOwnerPhone,
        rating,
        text,
      }),
    });
    if (!res.ok) throw new Error('failed');

    reviewStatus.textContent = "Thank you! Your review has been submitted for approval. 🐾";
    reviewForm.reset();
    reviewRatingInput.value = 0;
    reviewStars.forEach(s => s.classList.remove('selected'));
  } catch {
    reviewStatus.textContent = 'Something went wrong submitting your review — please try again.';
  }
});

// ── Approved site reviews ────────────────────────────────────────────────────
async function loadSiteReviews() {
  const track = document.getElementById('reviewsTrack');
  if (!track) return;
  try {
    const res = await fetch(`${BOOKING_API}/api/reviews`);
    if (!res.ok) return;
    const reviews = await res.json();
    track.insertAdjacentHTML('beforeend', reviews.map(r => `
      <div class="review-card reveal in-view">
        <div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
        <p>"${r.review_text}"</p>
        <span class="review-name">— ${r.owner_name}</span>
      </div>
    `).join(''));
  } catch {
    // reviews unavailable — leave the static testimonials as-is
  }
}

loadSiteReviews();

// ── Reviews & photos card stacks ─────────────────────────────────────────────
// Each stack shows one card at a time. Every tick either flips the front
// card to its back (revealing the full review) or, if already flipped,
// unflips it and sends it to the bottom of the stack so the next card rises
// to the top showing its front.
const STACK_TICK_MS = 6000;

function setupStack(stack, prevBtn, nextBtn, { flip = true } = {}) {
  if (!stack) return;
  const cards = [...stack.querySelectorAll('.review-card')];
  if (!cards.length) return;
  let order = cards.map((_, i) => i);
  let showingBack = false;

  function render() {
    cards.forEach(card => card.classList.remove('active'));
    order.forEach((cardIndex, pos) => {
      const card = cards[cardIndex];
      card.style.setProperty('--stack-pos', pos);
      card.style.zIndex = cards.length - pos;
      if (pos === 0) card.classList.add('active');
    });
  }

  function advance() {
    cards[order[0]].classList.remove('flipped');
    order.push(order.shift());
    showingBack = false;
    render();
  }

  function tick() {
    if (!flip) {
      advance();
      return;
    }
    if (showingBack) {
      advance();
    } else {
      cards[order[0]].classList.add('flipped');
      showingBack = true;
    }
  }

  render();
  let timer = setInterval(tick, STACK_TICK_MS);

  if (flip) {
    cards.forEach(card => {
      card.addEventListener('click', () => {
        if (!card.classList.contains('active')) return;
        card.classList.toggle('flipped');
        showingBack = card.classList.contains('flipped');
      });
    });
  }

  if (prevBtn) prevBtn.addEventListener('click', () => {
    cards[order[0]].classList.remove('flipped');
    order.unshift(order.pop());
    showingBack = false;
    render();
  });
  if (nextBtn) nextBtn.addEventListener('click', () => advance());

  [prevBtn, nextBtn].forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', () => {
      clearInterval(timer);
      timer = setInterval(tick, STACK_TICK_MS);
    });
  });
}

setupStack(document.getElementById('reviewsTrack'), document.querySelector('.reviews-prev'), document.querySelector('.reviews-next'), { flip: false });
setupStack(document.getElementById('photosTrack'), document.querySelector('.photos-prev'), document.querySelector('.photos-next'));
