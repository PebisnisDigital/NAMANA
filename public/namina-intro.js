(function () {
  "use strict";
  var intro = document.getElementById("intro");
  var video = document.getElementById("intro-video");
  var open = document.getElementById("open-namina");
  var status = document.getElementById("intro-status");
  if (!intro || !video || !open || !status) return;

  var useDirectLink = false;
  function showStatus(message) {
    status.hidden = false;
    status.textContent = message;
  }
  function showFallback() {
    useDirectLink = true;
    showStatus("Video belum dapat diputar di halaman ini. Ketuk BUKA NAMINA lagi untuk membuka video langsung.");
  }
  video.addEventListener("playing", function () {
    intro.classList.add("is-playing");
    status.hidden = true;
  });
  video.addEventListener("error", showFallback);
  open.addEventListener("click", function (event) {
    if (useDirectLink) return;
    if (!video.play) return; // The anchor remains a working fallback without video JavaScript support.
    event.preventDefault();
    showStatus("Memuat video intro…");
    try {
      video.muted = false;
      video.volume = 1;
      video.currentTime = 0;
      var playback = video.play(); // Called directly from the user gesture to permit sound.
      if (playback && typeof playback.catch === "function") playback.catch(showFallback);
    } catch (_error) {
      showFallback();
    }
  });
}());
