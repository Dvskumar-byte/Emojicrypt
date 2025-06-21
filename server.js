const express = require("express");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const path = require("path");

const app = express();
app.use(bodyParser.json());
app.use(express.static("public")); // serve frontend files

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://emojicrypt-c405e-default-rtdb.firebaseio.com",
});

// Signup route
app.post("/signup", async (req, res) => {
  const { email, password, name } = req.body;
  try {
    const user = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });
    res.status(201).json({ message: "Signup successful", uid: user.uid });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Signin route
app.post("/signin", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await admin.auth().getUserByEmail(email);
    res.status(200).json({ message: "Signin successful", name: user.displayName });
  } catch (err) {
    res.status(401).json({ error: "User not found" });
  }
});

// Fallback route for SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
