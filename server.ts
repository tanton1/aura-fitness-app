import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import firebaseConfig from "./firebase-applet-config.json";

// Initialize Firebase Admin with the correct project ID
initializeApp({
  projectId: firebaseConfig.projectId,
});
const auth = getAuth();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route to update user credentials
  app.post("/api/update-user", async (req, res) => {
    console.log("Received update request:", req.body);
    const { uid, email, password } = req.body;
    try {
      const updateData: any = {};
      if (email) updateData.email = email;
      if (password) updateData.password = password;
      
      console.log("Updating user in Firebase Auth:", uid, updateData);
      try {
        await auth.updateUser(uid, updateData);
        console.log("User updated successfully");
        res.json({ success: true });
      } catch (authError: any) {
        const errorString = String(authError.message || authError);
        if (authError.code === 'auth/user-not-found') {
          console.log("User not found in Auth, skipping update");
          res.json({ success: true, message: "User not found in Auth, skipped" });
        } else if (errorString.includes('Identity Toolkit API') || errorString.includes('PERMISSION_DENIED')) {
          console.log("Identity Toolkit API not enabled, skipping auth update");
          res.json({ success: true, message: "Auth update skipped (API disabled)" });
        } else {
          throw authError;
        }
      }
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
