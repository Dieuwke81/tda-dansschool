
// public/sw.js

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let data = {};
      try {
        data = event.data ? event.data.json() : {};
      } catch {
        // fallback: tekst payload (async!)
        let txt = "";
        try {
          txt = event.data ? await event.data.text() : "";
        } catch {}
        data = { title: "TDA Dansschool", body: txt || "Nieuwe melding" };
      }

      const title = data.title || "TDA Dansschool";
      const body = data.body || "Nieuwe melding";
      const url = data.url || "/";
      const tag = data.tag || "tda";

      const options = {
        body,
        icon: "/logo.png",
        badge: "/logo.png",
        data: { url },
        tag,          // groepeer meldingen
        renotify: true,
      };

      await self.registration.showNotification(title, options);
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/";

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // liefst: focus bestaande app tab
      for (const client of allClients) {
        try {
          // alleen dezelfde origin
          const clientUrl = new URL(client.url);
          const targetUrl = new URL(url, self.location.origin);

          if (clientUrl.origin === targetUrl.origin) {
            if ("focus" in client) await client.focus();
            if ("navigate" in client && client.url !== targetUrl.href) {
              await client.navigate(targetUrl.href);
            }
            return;
          }
        } catch {
          // ignore
        }
      }

      // anders: open nieuw venster
      await clients.openWindow(url);
    })()
  );
});
