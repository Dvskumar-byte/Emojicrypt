// ✅ Imports
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { getDatabase, ref, push, get, remove } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

// ✅ Emoji Sets
const sets = {
  animals: ['🐶','🐱','🦊','🐻','🐼','🦁','🐯','🐸','🐷','🐮','🐵','🦄','🐔','🐧','🐦','🐢'],
  food: ['🍔','🍕','🌭','🍿','🍩','🍪','🍫','🍓','🍇','🍉','🥭','🍎','🍋','🍟','🥪','🥤'],
  alphabet: [...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'],
  symbols: ['@','#','$','%','&','*','!','?','^','~','+','=','-','/','(',')']
};

// ✅ Helpers
function strToBinary(str) {
  return str.split('').map(char =>
    char.charCodeAt(0).toString(2).padStart(8, '0')
  ).join('');
}

function binaryToText(binaryStr) {
  const chars = binaryStr.match(/.{1,8}/g);
  return chars.map(bin => String.fromCharCode(parseInt(bin, 2))).join('');
}

function shuffleSet(set, password) {
  const arr = [...set];
  const seed = password.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (seed + i * 7) % arr.length;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getSet(style, password, isDecrypt = false) {
  const baseSet = sets[style] || sets.love;
  return shuffleSet(baseSet, password);
}


// ✅ Encrypt Function
async function encrypt() {
  const message = document.getElementById("messageInput").value;
  const password = document.getElementById("passwordInput").value;
  const style = document.getElementById("styleSelect").value;
  const outputDiv = document.getElementById("encryptedOutput");

  if (!message || !password) {
    alert("Please enter message and password");
    return;
  }

  const binary = strToBinary(message);
  const chunks = binary.match(/.{1,4}/g);
  const set = getSet(style, password);
  const encrypted = chunks.map(bin => {
    const index = parseInt(bin, 2) % set.length;
    return set[index];
  }).join('');

  outputDiv.innerHTML = `
    <strong>🔐 Encrypted Output:</strong><br>
    <span id="encryptedText">${encrypted}</span>
    <button class="copy-btn" onclick="copyText('encryptedText')">📋</button>
  `;

  const auth = getAuth();
  const user = auth.currentUser;

  if (user) {
    const db = getDatabase();
    const refPath = ref(db, "encryptedMessages/");
    const data = {
      email: user.email,
      original: message,
      encrypted,
      timestamp: new Date().toISOString()
    };

    try {
      await push(refPath, data);
    } catch (err) {
      console.error("Error saving to Firebase:", err.message);
    }
  }
}

// ✅ Decrypt Function
function decrypt() {
  const encryptedInput = document.getElementById("decryptInput").value;
  const password = document.getElementById("decryptPassword").value;
  const style = document.getElementById("decryptStyle").value;
  const outputDiv = document.getElementById("decryptedOutput");

  if (!encryptedInput || !password) {
    alert("Please enter both secret code and password.");
    return;
  }

  const set = getSet(style, password, true);
  let binary = "";

  for (let char of encryptedInput) {
    const index = set.indexOf(char);
    if (index === -1) {
      alert("Invalid characters found. Check style/password.");
      return;
    }
    binary += index.toString(2).padStart(4, '0');
  }

  const message = binaryToText(binary);
  outputDiv.innerHTML = `<strong>🔓 Decrypted Message:</strong><br>${message}`;
}

// ✅ Copy
function copyText(spanId) {
  const text = document.getElementById(spanId).textContent;
  navigator.clipboard.writeText(text).then(() => {
    alert("Copied to clipboard!");
  });
}

function copyFromNotif(id) {
  const text = document.getElementById(id).textContent;
  navigator.clipboard.writeText(text).then(() => {
    alert("Copied to clipboard!");
  });
}

// ✅ Dark Mode
function toggleDarkMode() {
  document.body.classList.toggle("dark");
}

// ✅ Notifications
function handleNotification() {
  const modal = document.getElementById("notificationModal");
  const content = document.getElementById("notificationContent");
  content.innerHTML = "Loading notifications...";

  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return;

  const db = getDatabase();
  const dbRef = ref(db, `notifications/${user.displayName || user.email.replace(/\W/g, '')}`);

  get(dbRef).then(snapshot => {
    if (snapshot.exists()) {
      const notifs = snapshot.val();
      const html = Object.entries(notifs).map(([key, val], index) => `
        <div class="notif-block" style="border: 1px solid #ccc; padding: 10px; margin: 10px 0;">
          <p><strong>📨 From:</strong> ${val.sender}</p>
          <p>
            <strong>🔐 Secret Code:</strong> 
            <span id="code-${index}">${val.code}</span>
            <button onclick="copyFromNotif('code-${index}')">📋</button>
          </p>
          <p>
            <strong>🔑 Password:</strong> 
            <span id="pass-${index}">${val.password}</span>
            <button onclick="copyFromNotif('pass-${index}')">📋</button>
          </p>
          <p><strong>🎨 Style Used:</strong> ${val.style || "Not specified"}</p>
          <button onclick="deleteNotification('${key}')">🗑️ Delete</button>
        </div>
      `).join('');
      content.innerHTML = html || "<p>No new notifications.</p>";
    } else {
      content.innerHTML = "<p>📭 No new notifications are there in your inbox.</p>";
    }

    modal.style.display = "block";
    setTimeout(() => { modal.style.display = "none"; }, 3000);
  }).catch(err => {
    content.innerHTML = "<p>⚠️ Error loading notifications.</p>";
    console.error(err);
    modal.style.display = "block";
  });
}

async function deleteNotification(id) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return;

  const db = getDatabase();
  const notifRef = ref(db, `notifications/${user.displayName || user.email.replace(/\W/g, '')}/${id}`);
  await remove(notifRef);
  handleNotification(); // Refresh notifications
}

// ✅ Messenger Feature
async function handleMessenger() {
  const username = prompt("Enter recipient username:");
  if (!username) return;

  const encryptedText = document.getElementById("encryptedText")?.textContent;
  const password = document.getElementById("passwordInput").value;
  const style = document.getElementById("styleSelect").value;

  const auth = getAuth();
  const sender = auth.currentUser?.displayName || auth.currentUser?.email;

  if (!encryptedText || !password || !sender) {
    alert("Secret code, password, or sender missing.");
    return;
  }

  // ✅ Firestore check
  const firestore = getFirestore();
  const userDocRef = doc(firestore, "users", username);

  try {
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const db = getDatabase();
      const notifPath = ref(db, `notifications/${username}`);

      await push(notifPath, {
        sender,
        password,
        code: encryptedText,
        style,
        timestamp: Date.now()
      });

      alert(`📩 Message sent to @${username}`);
    } else {
      alert(`❌ Receiver not found in the database`);
    }
  } catch (error) {
    alert("❌ Error checking username: " + error.message);
  }
}

// ✅ Panel Switching
const container = document.getElementById("container");
const registerBtn = document.getElementById("register");
const loginBtn = document.getElementById("login");

registerBtn.addEventListener("click", () => {
  container.classList.add("active");
});

loginBtn.addEventListener("click", () => {
  container.classList.remove("active");
});

// ✅ Expose to window
window.encrypt = encrypt;
window.decrypt = decrypt;
window.copyText = copyText;
window.copyFromNotif = copyFromNotif;
window.toggleDarkMode = toggleDarkMode;
window.handleNotification = handleNotification;
window.handleMessenger = handleMessenger;
window.deleteNotification = deleteNotification;
