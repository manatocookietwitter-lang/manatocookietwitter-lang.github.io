"use client";

import { useEffect } from "react";

type PlayStudyWindow = Window & {
  __playStudyLoaded?: boolean;
  __playStudyInstallPrompt?: Event;
};

function recoverLegacyServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) =>
      Promise.all(
        registrations
          .filter(
            (registration) =>
              registration.scope === `${location.origin}/playstudy/`,
          )
          .map((registration) => registration.unregister()),
      ),
    )
    .catch(() => {});

  if ("caches" in window) {
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => /^(?:playstudy-v[1-9]|playstudy-shell-v[1-9])(?:-|$)/.test(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .catch(() => {});
  }
}

export default function Home() {
  useEffect(() => {
    recoverLegacyServiceWorker();

    const playStudyWindow = window as PlayStudyWindow;
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      playStudyWindow.__playStudyInstallPrompt = event;
      window.dispatchEvent(new Event("playstudy-install-ready"));
    };
    window.addEventListener("beforeinstallprompt", captureInstallPrompt);

    if (playStudyWindow.__playStudyLoaded) return;
    playStudyWindow.__playStudyLoaded = true;

    const script = document.createElement("script");
    script.src = "/playstudy/app.js?v=10";
    script.dataset.playstudy = "app";
    document.body.appendChild(script);
    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
    };
  }, []);

  return (
    <>
      <link
        rel="stylesheet"
        href="/playstudy/styles.css?v=10"
        precedence="default"
      />
      <div id="app" />
      <input id="video-file" type="file" accept="video/*" multiple hidden />
      <input id="relink-file-global" type="file" accept="video/*" hidden />
    </>
  );
}
