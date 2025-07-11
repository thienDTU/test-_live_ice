// server.js
const express = require("express");
const wrtc = require("wrtc");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/offer", async (req, res) => {
  const { sdp } = req.body;

  const pc = new wrtc.RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  pc.oniceconnectionstatechange = async () => {
    console.log("📶 Server ICE state:", pc.iceConnectionState);
    if (pc.iceConnectionState === "connected") {
      console.log("✅ Server ICE connected", await pc.getStats());
    } else if (pc.iceConnectionState === "failed") {
      console.log("❌ Server ICE failed", await pc.getStats());
    }
  };

  pc.ondatachannel = (event) => {
    console.log("🔗 Server received data channel:", event.channel.label);
    event.channel.onopen = () => console.log("📡 Server data channel open");
    event.channel.onmessage = (msg) => console.log("💬 Server received:", msg.data);
  };

  // 👇 Phải chờ ICE candidate gathering hoàn tất
  const waitIceGatheringComplete = () => new Promise(resolve => {
    if (pc.iceGatheringState === "complete") return resolve();
    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === "complete") resolve();
    };
  });

  await pc.setRemoteDescription({ type: "offer", sdp });
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  await waitIceGatheringComplete(); // ⬅ Chờ ICE gathering xong

  res.json({ sdp: pc.localDescription.sdp }); // Lúc này mới gửi SDP đầy đủ
});


const PORT = 7088;
app.listen(PORT, () => {
  console.log(`✅ ICE Test Server running at http://localhost:${PORT}`);
});
