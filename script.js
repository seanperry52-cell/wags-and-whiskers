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

// ── Drop-in / walk time slots ───────────────────────────────────────────
// Drop-in visits and walks are the same for scheduling purposes — each
// books a single 30-minute slot, picked from the same availability data.
const DROP_IN_SERVICES = new Set(['Drop-In Visit', 'Dog Walking']);

const serviceTypeSelect = document.getElementById('serviceType');
const startDateInput = document.getElementById('startDate');
const startTimeInput = document.getElementById('startTime');
const dropinSlots = document.getElementById('dropinSlots');

async function renderTimeSlots() {
  const isDropIn = DROP_IN_SERVICES.has(serviceTypeSelect.value);
  const date = startDateInput.value;

  if (!isDropIn) {
    startTimeInput.style.display = '';
    dropinSlots.hidden = true;
    dropinSlots.innerHTML = '';
    return;
  }

  startTimeInput.style.display = 'none';
  dropinSlots.hidden = false;

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
      if (s.time === startTimeInput.value) btn.classList.add('slot-selected');
      btn.addEventListener('click', () => {
        startTimeInput.value = s.time;
        dropinSlots.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('slot-selected'));
        btn.classList.add('slot-selected');
      });
      dropinSlots.appendChild(btn);
    });
  } catch (err) {
    dropinSlots.innerHTML = '<p class="slots-error">Could not load times — please try again.</p>';
  }
}

serviceTypeSelect.addEventListener('change', () => {
  startTimeInput.value = '';
  renderTimeSlots();
});
startDateInput.addEventListener('change', () => {
  startTimeInput.value = '';
  renderTimeSlots();
});
renderTimeSlots();

// ── Booking form -> email + pre-filled printable contract ──────────────────
const bookingForm = document.getElementById('bookingForm');

// Base rates, pulled from the Rates & Pricing section
const RATE_INFO = {
  'Drop-In Visit':             { rate: 15, unit: 'per visit (30 min, under 5 mi — see Rates & Pricing for other options)' },
  'Overnight Stay':            { rate: 45, unit: 'per night' },
  'Dog Walking':               { rate: 15, unit: 'per visit (30 min, under 5 mi — see Rates & Pricing for other options)' },
};

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

function nightsBetween(start, end) {
  if (!start || !end) return 1;
  const diff = Math.round((new Date(end) - new Date(start)) / 86400000);
  return diff > 0 ? diff : 1;
}

function checkbox(checked) {
  return checked ? '☑' : '☐';
}

function buildContractHtml(d) {
  const serviceType = d.serviceType;
  const isDropIn = serviceType === 'Drop-In Visit';
  const isOvernight = serviceType === 'Overnight Stay';
  const isOther = serviceType === 'Dog Walking';

  const nights = nightsBetween(d.startDate, d.endDate);
  let rate = RATE_INFO[serviceType]?.rate ?? 0;
  let unit = RATE_INFO[serviceType]?.unit ?? '';
  let dailyTotal = '';
  let visitTotal = '';

  if (isOvernight) {
    if (nights >= 10) rate = 40;
    dailyTotal = `$${rate.toFixed(2)}`;
    visitTotal = `$${(rate * nights).toFixed(2)}`;
  }

  const dateRange = d.endDate && d.endDate !== d.startDate
    ? `${formatDate(d.startDate)} &ndash; ${formatDate(d.endDate)}`
    : formatDate(d.startDate);

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Pet Sitting Contract — ${d.ownerName}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #2a2018; max-width: 760px; margin: 2rem auto; padding: 0 1.5rem; line-height: 1.6; }
  h1 { text-align: center; font-size: 1.6rem; margin-bottom: 0.2rem; }
  h2 { font-size: 1.05rem; margin: 1.4rem 0 0.4rem; border-bottom: 1px solid #ccc; padding-bottom: 0.2rem; }
  .sub { text-align: center; color: #6b5645; margin-bottom: 1.5rem; }
  .field { margin: 0.3rem 0; }
  .field label { font-weight: bold; }
  .checks div { margin: 0.25rem 0; }
  .sign-block { margin-top: 2.5rem; }
  .sign-line { display: inline-block; min-width: 280px; border-bottom: 1px solid #2a2018; }
  .print-btn { display: block; margin: 0 auto 1.5rem; padding: 0.6rem 1.6rem; font-size: 1rem; cursor: pointer; }
  @media print { .print-btn { display: none; } }
</style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>

  <h1>Pet Sitting Contract</h1>
  <p class="sub">Wags and Whiskers by Misti, LLC &mdash; "Let us spoil your pets"</p>

  <p>This agreement is entered into on <strong>${today}</strong>, by and between:</p>

  <h2>Pet Owner</h2>
  <div class="field"><label>Name:</label> ${d.ownerName}</div>
  <div class="field"><label>Address:</label> ${d.address}</div>
  <div class="field"><label>Phone:</label> ${d.ownerPhone || '____________________'} &nbsp;&nbsp; <label>Email:</label> ${d.ownerEmail}</div>

  <h2>Pet Sitter / Walker (Service Provider)</h2>
  <div class="field">Wags and Whiskers by Misti, LLC, a Missouri limited liability company, by Misti Anderson, Managing Member</div>
  <div class="field"><label>Phone:</label> (816) 519-1012 &nbsp;&nbsp; <label>Email:</label> wagsandwhiskersbymistillc@gmail.com</div>

  <h2>1. Dog(s)/Cat(s) Information</h2>
  <div class="field">${d.petInfo}</div>

  <h2>2. Services Provided</h2>
  <div class="checks">
    <div>${checkbox(isDropIn)} Drop-in Visits (feeding, walks, litter box, medications, playtime, etc.)</div>
    <div>${checkbox(isOvernight)} Overnight at sitter's home (dogs only)</div>
    <div>${checkbox(false)} Day Care at sitter's home (dogs only)</div>
    <div>${checkbox(isOther)} Other: ${isOther ? serviceType : '_____________'}</div>
  </div>

  <h2>3. Dates &amp; Times</h2>
  <div class="field"><label>Service Date(s):</label> ${dateRange}</div>
  <div class="field"><label>Preferred Time:</label> ${formatTime(d.startTime)}</div>

  <h2>4. Payment</h2>
  <p>Due at end of visit or at last drop-in. Check or cash payment will be left at residence for drop-ins and held until the last drop-in.</p>
  <div class="field"><label>Rate:</label> $${rate.toFixed(2)} ${unit}</div>
  <div class="field"><label>Daily Total:</label> ${dailyTotal || '$__________'} &nbsp;&nbsp; <label>Visit Total:</label> ${visitTotal || '$__________'}</div>
  <div class="field"><label>Payment Due:</label> ☐ ____________ (date) &nbsp; ☐ At time of visit &nbsp; ☐ Weekly &nbsp; ☐ Biweekly &nbsp; ☐ Monthly</div>
  <div class="field"><label>Late Payment Fee:</label> $______ after ______ days</div>
  <div class="field"><label>Payment Methods:</label> Cash, Venmo, Cash App, Check</div>

  <h2>5. Liability &amp; Safety</h2>
  <p>Wags and Whiskers by Misti, LLC is not liable for illness/injury unless negligent. Owner confirms dog vaccinations and behavior disclosures.</p>

  <h2>6. Emergency Vet Care</h2>
  <p>In emergencies, the sitter will contact the owner, then the emergency contact if the owner is unavailable, provide care, and be reimbursed 100% of all care within 24 hours.</p>

  <h2>7. Term</h2>
  <p>This agreement is valid until canceled in writing.</p>

  <h2>8. Additional Notes</h2>
  <p>${d.notes || '____________________________________________________________'}</p>

  <div class="sign-block">
    <div class="field"><label>Client Name:</label> ${d.ownerName}</div>
    <div class="field"><label>Signature:</label> <span class="sign-line">&nbsp;</span> &nbsp;&nbsp; <label>Date:</label> ____________________</div>
  </div>

  <div class="sign-block">
    <div class="field">Wags and Whiskers by Misti, LLC, a Missouri limited liability company,</div>
    <div class="field"><label>By:</label> <span class="sign-line">&nbsp;</span> Misti Anderson, Managing Member</div>
    <div class="field"><label>Date:</label> ____________________</div>
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

  const data = new FormData(bookingForm);
  const d = Object.fromEntries(data.entries());

  if (DROP_IN_SERVICES.has(d.serviceType) && !d.startTime) {
    showBookingStatus('Please choose a time slot for your visit or walk.', 'error');
    return;
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
    renderTimeSlots();
  } catch (err) {
    // booking server unreachable — fall back to email-only flow
  }

  const subject = `Booking Request: ${d.serviceType} - ${d.ownerName}`;
  const lines = [
    `Name: ${d.ownerName}`,
    `Email: ${d.ownerEmail}`,
    `Phone: ${d.ownerPhone || 'N/A'}`,
    `Service Type: ${d.serviceType}`,
    `Start Date: ${d.startDate}`,
    `End Date: ${d.endDate || 'N/A'}`,
    `Preferred Time: ${d.startTime || 'N/A'}`,
    `Pet(s) Info: ${d.petInfo}`,
    `Address: ${d.address}`,
    `Notes: ${d.notes || 'N/A'}`,
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
