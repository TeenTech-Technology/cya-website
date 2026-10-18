# Chingola Youth Association (CYA) website

The website of the Chingola Youth Association, a youth-led non-profit in
Chingola, Zambia, registered under the National Youth Development Council (NYDC).

- **Live site:** https://teentech-technology.github.io/cya-website/
- **Website by:** Teen Tech Technology

It is a simple "static" website: plain HTML, CSS and JavaScript files. There is
no database and nothing to install. Open any `.html` file in a web browser to
see it, or edit it with any text editor (VS Code is a good choice).

---

## What each file is

| File | What it does |
|------|--------------|
| `index.html` | The **Home** page |
| `about.html` | **About** page: who we are, mission, vision, values, target groups |
| `programmes.html` | **Programmes** page: the 5 focus areas |
| `impact.html` | **Impact** page: numbers, projects and a photo gallery |
| `partners.html` | **Partners** page: KCM, NYDC, Local Government, LIYA |
| `events.html` | **Events** page: Youth Indaba, upcoming events, future plans |
| `contact.html` | **Contact** page: office, email, phone, socials and a contact form |
| `register.html` | **Register** page: Youth Indaba registration form |
| `style.css` | The look of **every** page: colours, fonts, sizes, layout, mobile view |
| `site.js` | The "moving parts" of every page: mobile menu, sending forms, photo viewer |
| `img/` | All the photos, the logo and the little browser icons |
| `favicon.ico` | The small icon shown in the browser tab |
| `.nojekyll` | An empty file that tells GitHub Pages to publish the files as they are |
| `README.md` | This guide |

### How a page is laid out

Every HTML page has the same parts, in this order, each marked with a comment
such as `<!-- Navigation (top menu bar) -->` so you can find it quickly:

1. **`<head>`**: page title, description and links to `style.css` and the icons
   (this part is not shown on the page itself).
2. **Navigation**: the logo and the menu at the top. The current page's link has
   `class="on"`, which colours it orange.
3. **Hero** (Home page) or **Page header** (other pages): the big banner with a photo.
4. **Sections** (`<section>`): the main content of the page.
5. **Footer**: the dark blue bar at the bottom with links and contact details.
6. **Script**: `<script src="site.js"></script>` loads the JavaScript.

The menu and footer are copied into every page, so if you change one of them,
change it in **all 8** HTML files.

`style.css` is split into numbered sections (Colours & base, Navigation, Buttons,
Hero, ... Footer, Photo viewer, Responsive / mobile). The main colours are at the
top under `:root` (for example `--b: #0b3c8c;` is the main blue). The
"Responsive / mobile" section at the end changes the layout on screens
900px wide or less (phones and small tablets); keep it last in the file.

---

## Photos

All images live in the **`img/`** folder (mostly `.webp` files, which are small
and load fast).

**To change a photo, you can either:**

1. **Replace the file:** save the new photo into `img/` with **exactly the same
   name** as the old one (for example `img/hero.webp`). Every page that uses it
   updates automatically. Or:
2. **Change the `src`:** put the new photo in `img/` with a new name, then
   change the `src="..."` in the HTML, for example
   `<img src="img/liya.webp" ...>` becomes `<img src="img/my-new-photo.jpg" ...>`.

Tips:

- Photos are cropped to fit their box. If the wrong part of a photo shows
  (for example heads are cut off), add or change `style="object-position:top"`
  (or `center 30%` etc.) on that `<img>`.
- Fill in `alt="..."` with a short description of the photo; it helps blind
  visitors and Google.
- Use reasonably small files (under about 300 KB) so the site stays fast.

Where the special photos are set:

- **Home page banner:** `img/hero.webp`, set in `style.css` (section 4, `.hero`).
- **Banners on the other pages:** in each page's `<header class="ph" style="--img:url(img/....webp)">`.
- **Logo:** `img/logo.webp` (in the navigation and footer of every page).
- **Picture shown when the link is shared on WhatsApp / Facebook:** `img/og.jpg`.
- **Browser / phone icons:** `favicon.ico`, `img/favicon.png`, `img/apple-touch-icon.png`.

Clicking any photo in the page content opens it big in the **photo viewer**
(lightbox). Use the ‹ › arrows, the keyboard arrow keys, or swipe on a phone to
move between photos; press **Escape**, click ×, or click the dark area to close.
This is done by `site.js`, so new photos work automatically.

---

## Changing the phone number or email

The current details are:

- Phone: **+260965175304**
- Email: **infocya260@gmail.com**

They appear in several places. Use your editor's "Find in files"
(VS Code: `Ctrl+Shift+F`) to search for the old number or email and replace
every match:

- the **footer** of all 8 HTML pages;
- the **Contact Us** section in `index.html` and `contact.html`;
- the note under the forms in `index.html`, `contact.html` and `register.html`;
- `site.js`: the error message shown if a form cannot send, **and** the form
  address `FORM_ADDRESS` (see below).

For phone links keep the format `href="tel:+260965175304"` (no spaces), and for
email links `href="mailto:someone@example.com"`.

---

## How the forms work

There are two forms: the **contact form** (on Home and Contact) and the
**Youth Indaba registration form** (on Register).

The website has no server of its own, so the forms use a free service called
**FormSubmit** (https://formsubmit.co). When someone presses the button,
`site.js` (section 2, "Form sending"):

1. collects what they typed;
2. sends it to `https://formsubmit.co/ajax/infocya260@gmail.com`;
3. FormSubmit emails it to **infocya260@gmail.com** (subject "CYA website: ...");
4. the page shows a green "Thank you!" message, or, if it failed, a red message
   asking the visitor to email or call **+260965175304**.

**Important, one time only:** the very first time a form is sent, FormSubmit
sends an email to infocya260@gmail.com asking to confirm. Open it and click
**"Activate Form"**. Until that is done, messages are not delivered. If you change
the email address in `site.js`, the new address must be activated the same way.

Each form's `data-mail="..."` attribute sets the email subject, and each field's
`name="..."` is the label that appears in the email.

---

## Publishing (how changes go live)

The site is hosted for free by **GitHub Pages** from this repository
(`TeenTech-Technology/cya-website`, branch `main`).

1. Make your changes and check them by opening the `.html` file in your browser.
2. Commit the changes and **push to the `main` branch** (with GitHub Desktop,
   VS Code, or `git push`). You can also edit a file directly on github.com and
   press "Commit changes".
3. GitHub Pages updates the live site automatically, usually in **about a
   minute**. If you still see the old version, refresh the page
   (`Ctrl+F5`, or add `?v=2` to the end of the address).

You can watch the progress in the repository's **Actions** tab on GitHub
("pages build and deployment").
