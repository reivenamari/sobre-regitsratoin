
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby2TLV3WfHHbgfjkRhV19jYSndk2DRswEEVdiuNWb7BnpyAneNWfU1LMJiuthk0Zmo/exec";

const GIVERS = [
  "John Rex", "Vhernadeth", "Reiven", "Irish",
  "Micha", "Bianca", "Renshi"
];

let registeredNames = Object.fromEntries(
  GIVERS.map(giver => [giver, []])
);

const form = document.getElementById("recipientForm");
const giverInput = document.getElementById("giver");
const recipientInput = document.getElementById("recipient");
const addButton = document.getElementById("addButton");
const message = document.getElementById("message");
const registry = document.getElementById("registry");

function showMessage(text, type) {
  message.textContent = text;
  message.className = "message " + type;
}

function api(action, giver = "", recipient = "") {
  return new Promise((resolve, reject) => {
    const callback = "sobreCallback_" +
      Date.now() + "_" + Math.floor(Math.random() * 100000);

    const script = document.createElement("script");
    const params = new URLSearchParams({
      action,
      giver,
      recipient,
      callback
    });

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Connection timeout."));
    }, 15000);

    function cleanup() {
      clearTimeout(timeout);
      delete window[callback];
      script.remove();
    }

    window[callback] = data => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Hindi mabuksan ang Apps Script URL."));
    };

    script.src = SCRIPT_URL + "?" + params.toString();
    document.body.appendChild(script);
  });
}

async function loadRegistry() {
  try {
    const result = await api("list");

    if (!result.success) {
      throw new Error(result.message);
    }

    registeredNames = result.data;
    renderRegistry();
  } catch (error) {
    showMessage(
      "Hindi makakonekta. Suriin ang URL at deployment.",
      "error"
    );
  }
}

form.addEventListener("submit", async event => {
  event.preventDefault();

  const giver = giverInput.value;
  const recipient = recipientInput.value.trim();

  if (!GIVERS.includes(giver) || !recipient) {
    showMessage("Punan nang tama ang impormasyon.", "error");
    return;
  }

  if ((registeredNames[giver] || []).length >= 10) {
    showMessage("Puno na ang 10 slots para sa nagbigay na ito.", "error");
    return;
  }

  addButton.disabled = true;
  addButton.textContent = "Sine-save...";

  try {
    const result = await api("add", giver, recipient);

    if (!result.success) {
      showMessage(result.message, "error");
      return;
    }

    recipientInput.value = "";
    showMessage(result.message, "success");
    await loadRegistry();
  } catch (error) {
    showMessage(
      "Hindi makakonekta sa Google Sheets. Suriin ang URL at deployment.",
      "error"
    );
  } finally {
    addButton.disabled = false;
    addButton.textContent = "I-save ang Pangalan";
  }
});

function renderRegistry() {
  registry.replaceChildren();

  GIVERS.forEach(giver => {
    const card = document.createElement("div");
    card.className = "giver-card";

    const heading = document.createElement("h3");
    heading.textContent = giver;
    card.appendChild(heading);

    const list = document.createElement("ul");
    list.className = "recipient-list";
    const names = registeredNames[giver] || [];

    if (names.length === 0) {
      const empty = document.createElement("li");
      empty.className = "empty";
      empty.textContent = "Wala pang nakarehistro.";
      list.appendChild(empty);
    }

    names.forEach(recipient => {
      const item = document.createElement("li");
      item.className = "recipient-item";

      const name = document.createElement("span");
      name.className = "recipient-name";
      name.textContent = recipient;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "delete-button";
      button.textContent = "Delete";

      button.addEventListener("click", async () => {
        if (!confirm(
          `Sigurado ka bang buburahin ang "${recipient}" sa listahan ni ${giver}?`
        )) return;

        button.disabled = true;

        try {
          const result = await api("delete", giver, recipient);

          if (!result.success) {
            showMessage(result.message, "error");
            button.disabled = false;
            return;
          }

          showMessage(result.message, "success");
          await loadRegistry();
        } catch (error) {
          showMessage("Hindi nakumpirma ang pag-delete.", "error");
          button.disabled = false;
        }
      });

      item.append(name, button);
      list.appendChild(item);
    });

    card.appendChild(list);
    registry.appendChild(card);
  });
}

loadRegistry();
