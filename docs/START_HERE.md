# Mahyco – Run the App from Start (Beginner Guide)

You have **MongoDB Compass**. Follow these steps in order.

---

## Part 1: Get MongoDB Running

MongoDB Compass is a **GUI** to view your database. It can also help you see if MongoDB is running.

### Option A: MongoDB is already installed on your PC

1. **Check if MongoDB is running**
   - Press **Win + R**, type `services.msc`, press Enter.
   - In the list, find **MongoDB Server**.
   - If **Status** is "Running" → you're good. Skip to **Part 2**.
   - If it's "Stopped" → right‑click **MongoDB Server** → **Start**.

2. **Open MongoDB Compass**
   - Open **MongoDB Compass**.
   - In the connection box at the top, you should see: `mongodb://localhost:27017`
   - Click **Connect**.
   - If it connects, you’ll see "localhost:27017" on the left. MongoDB is running.

### Option B: MongoDB is NOT installed (or Compass won’t connect)

1. **Install MongoDB**
   - Go to: https://www.mongodb.com/try/download/community
   - Choose **Windows**, **msi**, and download.
   - Run the installer. Click **Next** through the steps.
   - When asked, leave **"Install MongoDB as a Service"** checked (so it starts automatically).
   - Finish the install.

2. **Open Compass and connect**
   - Open **MongoDB Compass**.
   - Connection string: `mongodb://localhost:27017`
   - Click **Connect**.
   - You should see **localhost:27017** on the left. That’s your local MongoDB.

**Remember:** For the Mahyco app we use this same address: `mongodb://localhost:27017`

---

## Part 2: Set Up the Backend (.env)

1. **Go to your project folder**
   - Open File Explorer and go to: `D:\Phase 2(Projects)\Mahyco\backend`

2. **Create or edit the `.env` file**
   - If there is **no** `.env` file:
     - Copy the file named `.env.example`
     - Paste it in the same folder and **rename** the copy to `.env`
   - Open `.env` in Notepad (or your editor).

3. **Make sure these lines are in `.env`** (for local MongoDB):

   ```
   MONGODB_URI=mongodb://localhost:27017
   MAHYCO_DB=mahyco_db
   JWT_SECRET=mahyco-super-secret-change-in-production
   UPLOAD_DIR=./uploads
   ```

   - **Save** the file and close it.

---

## Part 3: Run the Backend (FastAPI)

1. **Open a terminal**
   - In VS Code / Cursor: **Terminal** → **New Terminal**
   - Or: press **Win + R**, type `cmd`, press Enter.

2. **Go to the backend folder**
   - Type (or copy‑paste) and press Enter:

   ```bash
   cd "D:\Phase 2(Projects)\Mahyco\backend"
   ```

3. **Create a virtual environment (first time only)**
   - Run:

   ```bash
   python -m venv venv
   ```

4. **Activate the virtual environment**
   - **Windows (CMD):**
     ```bash
     venv\Scripts\activate
     ```
   - **Windows (PowerShell):**
     ```bash
     .\venv\Scripts\Activate.ps1
     ```
   - You should see `(venv)` at the start of the line.

5. **Install dependencies (first time only)**
   - Run:

   ```bash
   pip install -r requirements.txt
   ```

6. **Start the backend server**
   - Run:

   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

   - When it’s ready you’ll see something like: `Uvicorn running on http://127.0.0.1:8000`
   - **Leave this terminal open.** The backend must keep running.

7. **Quick check**
   - Open a browser and go to: **http://localhost:8000/docs**
   - You should see the API documentation page. Backend is working.

---

## Part 4: Run the Frontend (React)

1. **Open a SECOND terminal** (don’t close the first one).

2. **Go to the frontend folder**
   - Run:

   ```bash
   cd "D:\Phase 2(Projects)\Mahyco\frontend"
   ```

3. **Install dependencies (first time only)**
   - Run:

   ```bash
   npm install
   ```

4. **Start the frontend**
   - Run:

   ```bash
   npm run dev
   ```

   - When it’s ready it will show something like: `Local: http://localhost:3000`

5. **Open the app**
   - In your browser go to: **http://localhost:3000**
   - You should see the **Mahyco** login page.

---

## Part 5: Use the App

1. **Register**
   - Click **Register**.
   - Fill: Full name, Email, Password.
   - Choose **User** or **Company** (if Company, add company name).
   - Click **Create account**.
   - You’ll be logged in and taken to the Dashboard.

2. **Upload and analyze**
   - On the Dashboard, open the **Upload & analyze** tab.
   - Drag an image (e.g. a drone/agriculture photo) into the box, or click **Browse files**.
   - Click **Analyze image**.
   - When it finishes, open the **Analysis report** tab to see the result and **Download report** if you want.

3. **History**
   - In the **History** tab you’ll see all your past analyses. You can **View** or **Download** any of them.

---

## Part 6: See Your Data in MongoDB Compass

1. **Open MongoDB Compass** and connect to `mongodb://localhost:27017` (if not already).

2. **Find the Mahyco database**
   - In the left sidebar, click **localhost:27017**.
   - You should see a database named **mahyco_db** (from `MAHYCO_DB` in `.env`).
   - Click **mahyco_db**.

3. **Collections**
   - **users** – registered users (email, role, etc.).
   - **analyses** – each analysis (filename, health score, chunks, etc.).

Click a collection name to browse documents. No need to create collections manually; the app creates them when you register and run analyses.

---

## Checklist (summary)

- [ ] MongoDB running (Compass connects to `localhost:27017`)
- [ ] `backend/.env` has `MONGODB_URI=mongodb://localhost:27017`
- [ ] Backend: `cd backend` → activate venv → `uvicorn app.main:app --reload --port 8000`
- [ ] Frontend: `cd frontend` → `npm run dev`
- [ ] Browser: **http://localhost:3000** → Register → Upload image → Analyze

---

## If Something Fails

| Problem | What to do |
|--------|-------------|
| Compass won’t connect | Start MongoDB service (see Part 1, Option A step 1) or install MongoDB (Option B). |
| `python` or `pip` not found | Install Python from python.org and tick “Add Python to PATH”. |
| `npm` not found | Install Node.js from nodejs.org (LTS). |
| Backend error about MongoDB | Check `.env`: `MONGODB_URI=mongodb://localhost:27017` and that MongoDB is running. |
| Frontend can’t reach API | Make sure the backend is still running in the first terminal on port 8000. |

If you tell me the exact error message (or a screenshot), I can give you the next step.
