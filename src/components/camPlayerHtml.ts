/**
 * Inline HTML player that mirrors assets/js/custom/it-ip-cams.js:
 *   - sub  → WebRTC WHEP first, then HLS.js fallback
 *   - main → HLS.js (same as web for main / multi)
 *
 * Loaded inside react-native-webview with baseUrl https://stream.nysonik.com
 * so MediaMTX cookieCheck works like the browser.
 */

export type CamPlayerParams = {
  playPath: string;
  quality: 'main' | 'sub';
  /** Correlates postMessage events when multiple tiles are on screen. */
  playerId?: string;
  hlsBase?: string;
  webrtcBase?: string;
};

export function buildCamPlayerHtml({
  playPath,
  quality,
  playerId = 'cam',
  hlsBase = 'https://stream.nysonik.com/',
  webrtcBase = 'https://stream-webrtc.nysonik.com/',
}: CamPlayerParams): string {
  const safePath = JSON.stringify(String(playPath || ''));
  const safeQuality = JSON.stringify(quality === 'main' ? 'main' : 'sub');
  const safeId = JSON.stringify(String(playerId || 'cam'));
  const safeHls = JSON.stringify(hlsBase.replace(/\/?$/, '/'));
  const safeRtc = JSON.stringify(webrtcBase.replace(/\/$/, ''));

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.15/dist/hls.min.js"></script>
<style>
  html, body { margin:0; padding:0; width:100%; height:100%; background:#0D0D14; overflow:hidden; }
  #v { width:100%; height:100%; object-fit:cover; background:#0D0D14; }
  #msg {
    position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
    color:rgba(255,255,255,.7); font:600 12px -apple-system,BlinkMacSystemFont,sans-serif;
    text-align:center; padding:16px; pointer-events:none;
  }
  #msg.hidden { display:none; }
</style>
</head>
<body>
<video id="v" playsinline webkit-playsinline muted autoplay></video>
<div id="msg">Connecting…</div>
<script>
(function () {
  const playPath = ${safePath};
  const quality = ${safeQuality};
  const playerId = ${safeId};
  const hlsBase = ${safeHls};
  const webrtcBase = ${safeRtc};
  const video = document.getElementById('v');
  const msg = document.getElementById('msg');
  let hls = null;
  let pc = null;
  let retries = 0;

  function post(type, detail) {
    try {
      var payload = JSON.stringify({ type: type, detail: detail || '', id: playerId });
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(payload);
      } else if (window.parent && window.parent !== window) {
        // Expo web: player runs in an iframe (react-native-webview is native-only).
        window.parent.postMessage(payload, '*');
      }
    } catch (e) {}
  }

  function setMsg(text) {
    if (!text) { msg.classList.add('hidden'); msg.textContent = ''; return; }
    msg.classList.remove('hidden');
    msg.textContent = text;
  }

  function cleanupRtc() {
    if (pc) { try { pc.close(); } catch (e) {} pc = null; }
  }

  function cleanupHls() {
    if (hls) { try { hls.destroy(); } catch (e) {} hls = null; }
  }

  function waitForIceGathering(peer, timeoutMs) {
    timeoutMs = timeoutMs || 2500;
    return new Promise(function (resolve) {
      if (peer.iceGatheringState === 'complete') { resolve(); return; }
      var done = false;
      var finish = function () {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve();
      };
      var check = function () {
        if (peer.iceGatheringState === 'complete') finish();
      };
      peer.addEventListener('icegatheringstatechange', check);
      var timer = setTimeout(finish, timeoutMs);
    });
  }

  function tryWebRTC() {
    return new Promise(function (resolve) {
      var settled = false;
      var finish = function (ok) {
        if (settled) return;
        settled = true;
        clearTimeout(failTimer);
        if (!ok) cleanupRtc();
        resolve(!!ok);
      };
      var failTimer = setTimeout(function () { finish(false); }, 10000);

      try {
        pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      } catch (e) {
        finish(false);
        return;
      }

      pc.ontrack = function (event) {
        if (event.streams && event.streams[0]) {
          video.srcObject = event.streams[0];
        }
      };

      pc.addEventListener('connectionstatechange', function () {
        if (pc.connectionState === 'connected') {
          video.play().catch(function () {});
          setMsg('');
          post('live', 'webrtc');
          finish(true);
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          finish(false);
        }
      });

      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });

      pc.createOffer()
        .then(function (offer) { return pc.setLocalDescription(offer); })
        .then(function () { return waitForIceGathering(pc); })
        .then(function () {
          return fetch(webrtcBase + '/' + encodeURIComponent(playPath) + '/whep', {
            method: 'POST',
            headers: { 'Content-Type': 'application/sdp' },
            body: pc.localDescription.sdp,
          });
        })
        .then(function (response) {
          if (!response.ok) throw new Error('WHEP ' + response.status);
          return response.text();
        })
        .then(function (sdp) { return pc.setRemoteDescription({ type: 'answer', sdp: sdp }); })
        .catch(function () { finish(false); });
    });
  }

  function playHls() {
    cleanupRtc();
    cleanupHls();
    video.srcObject = null;
    var url = hlsBase + playPath + '/index.m3u8';
    var isMain = quality === 'main';

    if (window.Hls && Hls.isSupported()) {
      hls = new Hls({
        liveSyncDurationCount: isMain ? 3 : 1,
        liveMaxLatencyDurationCount: isMain ? 6 : 2,
        maxBufferLength: isMain ? 16 : 2,
        liveBackBufferLength: isMain ? 5 : 0,
        fragLoadingTimeOut: isMain ? 20000 : 10000,
        manifestLoadingTimeOut: isMain ? 20000 : 10000,
        levelLoadingTimeOut: isMain ? 20000 : 10000,
        xhrSetup: function (xhr) {
          try { xhr.withCredentials = true; } catch (e) {}
        },
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, function () {
        video.muted = true;
        video.play().catch(function () {});
        setMsg('');
        post('live', 'hls');
      });
      hls.on(Hls.Events.ERROR, function (_evt, data) {
        if (!data || !data.fatal) return;
        if (retries < 3) {
          retries += 1;
          setMsg('Reconnecting…');
          post('loading', 'retry');
          setTimeout(playHls, 3000);
          return;
        }
        setMsg('Unable to play feed');
        post('error', 'hls');
      });
      return;
    }

    // Safari / some WebViews: native HLS
    video.src = url;
    video.muted = true;
    video.addEventListener('playing', function () {
      setMsg('');
      post('live', 'native-hls');
    }, { once: true });
    video.addEventListener('error', function () {
      setMsg('Unable to play feed');
      post('error', 'native-hls');
    }, { once: true });
    video.play().catch(function () {});
  }

  async function start() {
    if (!playPath) {
      setMsg('Missing stream path');
      post('error', 'missing-path');
      return;
    }
    post('loading', '');
    setMsg('Connecting…');

    // Mirror web connectTile(): WebRTC for sub only; main goes straight to HLS.
    if (quality !== 'main') {
      var ok = await tryWebRTC();
      if (ok) return;
      setMsg('Switching to HLS…');
    }
    playHls();
  }

  start();
})();
</script>
</body>
</html>`;
}
