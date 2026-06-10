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

// ── Booking form -> email ──────────────────────────────────────────────────
const bookingForm = document.getElementById('bookingForm');

bookingForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const data = new FormData(bookingForm);
  const subject = `Booking Request: ${data.get('serviceType')} - ${data.get('ownerName')}`;

  const lines = [
    `Name: ${data.get('ownerName')}`,
    `Email: ${data.get('ownerEmail')}`,
    `Phone: ${data.get('ownerPhone') || 'N/A'}`,
    `Service Type: ${data.get('serviceType')}`,
    `Start Date: ${data.get('startDate')}`,
    `End Date: ${data.get('endDate') || 'N/A'}`,
    `Pet(s) Info: ${data.get('petInfo')}`,
    `Address: ${data.get('address')}`,
    `Notes: ${data.get('notes') || 'N/A'}`,
  ];

  const body = lines.join('\n');
  const mailtoLink = `mailto:wagsandwhiskersbymistillc@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  window.location.href = mailtoLink;
});

// ── Footer year ─────────────────────────────────────────────────────────────
document.getElementById('year').textContent = new Date().getFullYear();
