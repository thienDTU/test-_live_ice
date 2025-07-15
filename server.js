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
  console.log("📩 Server received offer request", sdp);
    const pc = new wrtc.RTCPeerConnection({
    iceServers: [
      // { urls: "stun:stun.l.google.com:19302" },
              {
                          "urls": "turn:turn-stg-01.clickqa.net:3479",
                          "username": "1754818227",
                          "credential": "j8A6o9oJKrI+VxTK79dSkZr23CQ="
                      },
              ],
    iceTransportPolicy: "relay",
    bundlePolicy: "max-bundle", 
    });

  pc.oniceconnectionstatechange = async () => {
  console.log("📶 Server ICE state:", pc.iceConnectionState);
  if (pc.iceConnectionState === "connected") {
    const stats = await pc.getStats();
    stats.forEach(report => {
      if (report.type === "candidate-pair" && report.state === "succeeded" && report.nominated) {
        console.log("✅ Using candidate pair:", {
          local: report.localCandidateId,
          remote: report.remoteCandidateId
        });
      }
    });
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
  console.log("📤 Server sending answer:", pc.localDescription.sdp);
  res.json({ sdp: pc.localDescription.sdp }); // Lúc này mới gửi SDP đầy đủ
});


const PORT = 7088;
app.listen(PORT, () => {
  console.log(`✅ ICE Test Server running at http://localhost:${PORT}`);
});
