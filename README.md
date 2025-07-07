# GoodX Diary App

## Overview

GoodX Diary is a web application that lets you easily manage diary bookings through an intuitive calendar interface. You can log in, view, create, edit, drag-and-drop, and delete bookings quickly and easily.

## Prerequisites

You will need:

* A modern web browser (Chrome recommended).
* **Optional:** Node.js (if you want to use `http-server` or `serve`).
* **Optional:** Python 3 (if you want to use the built-in HTTP server).

## Running Locally

### Clone the repository

Open your terminal and run:

```bash
git clone https://github.com/HollowFiend/goodx-diary-app.git
cd goodx-diary-app
```

### Serve the `public/` folder

The front-end files are static, and you can serve them using any of these methods:

#### Using `http-server` (easiest, no installation needed)

```bash
npx http-server public
```

Open the URL displayed (usually `http://127.0.0.1:8080`).

#### Using `serve`

First, install `serve` globally (if you haven't already):

```bash
npm install -g serve
```

Then, run:

```bash
serve public
```

Visit `http://localhost:5000` or the URL shown.

#### Using Python 3

Run:

```bash
cd public
python3 -m http.server 3000
```

Then, go to `http://localhost:3000`.

## API Back-end

The app expects an API server at `/api`.

* If you have your own local API server, ensure it's running on the same host and port.
* To point the app to a different API URL, edit `public/js/api.js` and change the `API_BASE` constant.

### Deploying the Firebase Proxy

The app includes a Firebase Function (`functions/index.js`) to forward all `/api` requests to `https://dev_interview.qagoodx.co.za/api`. Here’s how you deploy this:

1. Install the Firebase CLI if you haven't already:

```bash
npm install -g firebase-tools
```

2. Log into Firebase and select your project:

```bash
firebase login
firebase use --add your-firebase-project-id
```

3. Deploy both hosting and functions:

```bash
firebase deploy --only hosting,functions
```

Once this is done, your `/api` requests will automatically be forwarded through Firebase.

### Publishing to Firebase Hosting

The project includes a `firebase.json` file to:

* Host the files from the `public/` folder.
* Forward all `/api/*` calls to your Cloud Function.

To deploy:

1. Install Firebase CLI and log in:

```bash
npm install -g firebase-tools
firebase login
```

2. Choose your Firebase project (do this only the first time):

```bash
firebase use --add your-project-id
```

3. Deploy to Firebase Hosting and Functions:

```bash
firebase deploy --only hosting,functions
```

Your app will now be live at `https://<your-project>.web.app/`, and all API calls will work properly.

## Logging In

* Open the login page (the root URL).
* Enter your username and password.
* Click **Login**. You’ll be redirected to the dashboard if successful.

## Using the Dashboard

* **Create a booking:** Click **➕ New** or select an empty time slot.
* **Edit a booking:** Click on a booking to change the details or delete it.
* **Drag & Drop:** Move bookings by dragging them.
* **Resize:** Adjust booking duration by resizing the edges.

## Configuration

You can customize the app using these files:

* **Front-end logic:** `public/js/dashboard.js`
* **API helper functions:** `public/js/api.js`
* **CSS styles:** `public/css/main.css`
* **Dialogs:** Native `<dialog>` elements in `public/dashboard.html`

## Troubleshooting

* If bookings or login don't work, check your browser's console for errors.
* Ensure cookies are enabled, as they're required for session authentication.
* If you see CORS errors, confirm your API server allows requests from your domain.( This is why there is a proxy) (Just be whitelisted on the origins API’s CORS list then no need for proxy)
