// public/sw.js

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // fallback: tekst payload
    data = { title: "TDA Dansschool", body: event.data?.text?.() || "" };
  }

  const title = data.title || "TDA Dansschool";
  const body = data.body || "Nieuwe melding";
  const url = data.url || "/";

  const options = {
    body,
    icon: "/logo.png",      // pas aan als je een nette icon hebt
    badge: "/logo.png",     // idem
    data: { url },
  };

  event.waitUntil(self.registration.showNotification(title, options));
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

      // als er al een tab open is: focus + navigeer
      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(url);
          return;
        }
      }

      // anders: open nieuw venster
      await clients.openWindow(url);
    })()
  );
});
