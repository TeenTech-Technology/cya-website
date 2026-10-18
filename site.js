/* =========================================================
   Chingola Youth Association (CYA) - website script
   ---------------------------------------------------------
   Every page loads this file. It does three jobs:
     1. Mobile menu: the ☰ button opens and closes the menu
     2. Forms: sends the contact / registration forms by email
     3. Photo viewer: click a photo to see it big (lightbox)
   ========================================================= */


/* ---------- 1. Mobile menu toggle ---------- */

// On small screens the menu links are hidden. Clicking ☰ adds or removes
// the "open" class on the list of links (see "nav ul.open" in style.css).
document.querySelector('.menu').onclick = function () {
  var menuList = document.querySelector('nav ul');
  var isOpen = menuList.classList.toggle('open');
  this.setAttribute('aria-expanded', isOpen);
};


/* ---------- 2. Form sending ---------- */

// Where the forms are sent. FormSubmit (formsubmit.co) forwards each form
// to this email address. (The first time, FormSubmit sends an
// "Activate Form" email to this address, which must be clicked once.)
var FORM_ADDRESS = 'https://formsubmit.co/ajax/infocya260@gmail.com';

// Every <form> that has a data-mail="..." attribute is sent this way.
// The data-mail text becomes the email subject, e.g. "CYA website: Website enquiry".
document.querySelectorAll('form[data-mail]').forEach(function (form) {
  form.addEventListener('submit', function (event) {
    // Stop the browser from leaving the page; we send the form ourselves.
    event.preventDefault();

    // The "Send" button, and its text so we can put it back afterwards.
    var button = form.querySelector('button[type=submit],button:not([type]),input[type=submit]');
    var buttonText = button ? button.textContent : '';

    // Collect every field into an object, e.g. { Name: "...", Email: "..." }.
    var data = {};
    new FormData(form).forEach(function (value, key) {
      data[key] = value;
    });

    // Extra settings that FormSubmit understands.
    data._subject = 'CYA website: ' + form.dataset.mail;  // email subject
    data._template = 'table';                             // neat table layout
    data._captcha = 'false';                              // no "I am not a robot" page
    if (data.Email) data._replyto = data.Email;           // "Reply" goes to the visitor

    // Show that something is happening.
    if (button) {
      button.disabled = true;
      button.textContent = 'Sending...';
    }

    // The line of text under the form that shows the result.
    var message = form.querySelector('.fmsg');
    if (!message) {
      message = document.createElement('p');
      message.className = 'fmsg';
      form.appendChild(message);
    }
    message.textContent = '';

    // Send the form as JSON to FormSubmit.
    fetch(FORM_ADDRESS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data)
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (result) {
        // FormSubmit answers { success: "true" } or { success: "false" }.
        if (result.success === 'false' || result.success === false) throw 0;

        // It worked: empty the form and say thank you (green).
        form.reset();
        message.className = 'fmsg ok';
        message.textContent = 'Thank you! Your message was sent to CYA. We will get back to you soon.';
      })
      .catch(function () {
        // It failed (no internet, or FormSubmit said no): show email and phone (red).
        message.className = 'fmsg err';
        message.innerHTML = 'Sorry, it could not send. Please email <a href="mailto:infocya260@gmail.com">infocya260@gmail.com</a> or call <a href="tel:+260965175304">+260965175304</a>.';
      })
      .finally(function () {
        // Either way, make the button usable again.
        if (button) {
          button.disabled = false;
          button.textContent = buttonText;
        }
      });
  });
});


/* ---------- 3. Clickable photo viewer (lightbox) ---------- */

(function () {
  // All photos in the page content (not the logo in the menu or footer).
  var photos = [].slice.call(document.querySelectorAll('main img,section img,header img')).filter(function (img) {
    return !img.closest('nav,footer,.brand');
  });
  if (!photos.length) return;  // no photos on this page: nothing to do

  // Build the viewer: a dark box with close / previous / next buttons
  // and one big image. It stays hidden until a photo is clicked.
  var viewer = document.createElement('div');
  viewer.className = 'lb';
  viewer.innerHTML = '<button class="lbx" aria-label="Close">×</button><button class="lbp" aria-label="Previous">‹</button><img alt=""><button class="lbn" aria-label="Next">›</button>';
  document.body.appendChild(viewer);

  var bigImage = viewer.querySelector('img');
  var current = 0;  // number of the photo being shown

  // Show photo number n (wraps around at the start and end).
  function show(n) {
    current = (n + photos.length) % photos.length;
    bigImage.src = photos[current].currentSrc || photos[current].src;
    bigImage.alt = photos[current].alt;
    viewer.classList.add('on');
    document.body.style.overflow = 'hidden';  // stop the page scrolling behind
  }

  // Close the viewer.
  function hide() {
    viewer.classList.remove('on');
    document.body.style.overflow = '';
  }

  // Make every photo clickable (and usable with the keyboard: Tab + Enter).
  photos.forEach(function (img, i) {
    img.classList.add('zoom');
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      show(i);
    });
    img.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        show(i);
      }
    });
  });

  // Buttons: × closes, ‹ previous photo, › next photo.
  viewer.querySelector('.lbx').onclick = hide;
  viewer.querySelector('.lbp').onclick = function (event) {
    event.stopPropagation();
    show(current - 1);
  };
  viewer.querySelector('.lbn').onclick = function (event) {
    event.stopPropagation();
    show(current + 1);
  };

  // Clicking the dark area around the photo closes the viewer.
  viewer.addEventListener('click', function (event) {
    if (event.target === viewer) hide();
  });

  // Keyboard: Escape closes, left / right arrows change photo.
  document.addEventListener('keydown', function (event) {
    if (!viewer.classList.contains('on')) return;
    if (event.key === 'Escape') hide();
    if (event.key === 'ArrowLeft') show(current - 1);
    if (event.key === 'ArrowRight') show(current + 1);
  });

  // Phones: swipe left for the next photo, swipe right for the previous one.
  var touchStartX = null;
  viewer.addEventListener('touchstart', function (event) {
    touchStartX = event.touches[0].clientX;
  });
  viewer.addEventListener('touchend', function (event) {
    if (touchStartX === null) return;
    var distance = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(distance) > 50) show(current + (distance < 0 ? 1 : -1));
    touchStartX = null;
  });
})();
