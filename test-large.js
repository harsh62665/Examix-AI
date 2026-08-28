const fs = require('fs');
const str = "A".repeat(5 * 1024 * 1024); // 5MB string
fetch("http://localhost:3000/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ messages: [{ role: "user", content: str }] })
}).then(res => console.log("Status:", res.status))
.catch(err => console.log("Fetch Error:", err.message));
