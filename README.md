# GoodX Diary App

## Overview

GoodX Diary is a web application designed to manage diary bookings through an intuitive calendar interface. Users can log in to view, create, edit, drag-and-drop, and delete bookings effortlessly.

## Prerequisites

* A modern web browser (Chrome).
* **Optional:** Node.js (for using `http-server` or `serve`).
* **Optional:** Python 3 (for using the built-in HTTP server).

## Running Locally

### Clone the repository

```bash
git clone https://github.com/HollowFiend/goodx-diary-app.git
cd goodx-diary-app
```

### Serve the `public/` folder

The front-end is static. Choose one of the following methods:

#### Using `http-server` (no installation required)

```bash
npx http-server public
```

Open the URL printed in your terminal (e.g., `http://127.0.0.1:8080`).

#### Using `serve`

Install if needed:

```bash
npm install -g serve
```

Then:

```bash
serve public
```

Browse to `http://localhost:5000` (or the URL shown).

#### Using Python 3

```bash
cd public
python3 -m http.server 3000
```

Browse to `http://localhost:3000`.

## API Back-end

The front-end expects the API endpoint at `/api`.

* If you have a local API server, ensure it's running on the same host/port.
* To change the base path, edit `public/js/api.js` and update the `API_BASE` constant.

## Logging In

* Open the login page (root URL).
* Enter your username and password.
* Click **Login**. You will be redirected to the dashboard upon successful login.

## Using the Dashboard

* **Create a booking:** Click **➕ New** in the toolbar or select an empty time slot.
* **Edit a booking:** Click on an existing booking to change its time, duration, or reason. You can also delete it here.
* **Drag & Drop:** Move an event by dragging it.
* **Resize:** Adjust the duration by resizing an event's edges.

## Configuration

* **Front-end logic:** `public/js/dashboard.js`
* **API helper functions:** `public/js/api.js`
* **CSS styles:** `public/css/main.css`
* **Dialogs:** Native `<dialog>` elements in `public/dashboard.html`

## Troubleshooting

* If events or login fail, check your browser's console for network errors.
* Ensure cookies are enabled (required for session authentication).
* If encountering CORS errors, verify your API server is running and permits requests from your front-end domain.
