# How to Set Up MongoDB for Mahyco

You can use **MongoDB locally** (Windows) or **MongoDB Atlas** (cloud, free tier).

---

## Option A: Local MongoDB (Windows)

### 1. Download and install

1. Go to [MongoDB Community Downloads](https://www.mongodb.com/try/download/community-edition).
2. Select **Windows**, choose the latest **Community** version, and download the **MSI**.
3. Run the installer. Use default settings (install as service, port **27017**).
4. (Optional) Install **MongoDB Shell (mongosh)** from the same page if you want to run commands in a terminal.

### 2. Start MongoDB

- If you chose “Install as a service”, MongoDB starts automatically.
- To start/stop manually: **Services** (Win + R → `services.msc`) → find **MongoDB** → Start/Stop.

### 3. Backend `.env`

In `backend/`, copy the example env and set the URI:

```env
MONGODB_URI=mongodb://localhost:27017
MAHYCO_DB=mahyco_db
JWT_SECRET=your-super-secret-key-change-in-production
UPLOAD_DIR=./uploads
```

No username/password for a default local install. The app will create the database and collections on first use.

---

## Option B: MongoDB Atlas (cloud, free tier)

### 1. Create a cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Sign up or log in.
3. Create a **free** M0 cluster (e.g. AWS, region nearest to you).
4. Create a database user: **Database Access** → **Add New Database User** (username + password; save the password).
5. Allow network access: **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`) for development, or add your IP for production.

### 2. Get the connection string

1. In Atlas, click **Connect** on your cluster.
2. Choose **Connect your application**.
3. Copy the connection string. It looks like:

   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

4. Replace `<username>` and `<password>` with your database user (URL-encode the password if it has special characters).

### 3. Backend `.env`

In `backend/`, create or edit `.env`:

```env
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MAHYCO_DB=mahyco_db
JWT_SECRET=your-super-secret-key-change-in-production
UPLOAD_DIR=./uploads
```

Use your real Atlas URI in `MONGODB_URI`. The app will use the database name `mahyco_db` (from `MAHYCO_DB`).

---

## Quick check

1. Create `backend/.env` from `backend/.env.example` and set `MONGODB_URI` (and `MAHYCO_DB` if you want a different name).
2. Start the backend:

   ```bash
   cd backend
   uvicorn app.main:app --reload --port 8000
   ```

3. Open http://localhost:8000/docs and try **Register** then **Login**. If those work, MongoDB is set up correctly.

---

## Summary

| Setup        | `MONGODB_URI` |
|-------------|----------------|
| Local       | `mongodb://localhost:27017` |
| Atlas       | `mongodb+srv://user:pass@cluster....mongodb.net/?retryWrites=true&w=majority` |

Always keep `.env` out of version control (it’s in `.gitignore`). For production, use a strong `JWT_SECRET` and restrict Atlas IPs.
