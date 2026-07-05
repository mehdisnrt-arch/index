(function () {
  "use strict";

  var storageKey = "index-compteur-radio-readings-v1";

  var form = document.getElementById("readingForm");
  var dateInput = document.getElementById("dateInput");
  var radioInput = document.getElementById("radioInput");
  var indexInput = document.getElementById("indexInput");
  var statusMessage = document.getElementById("statusMessage");
  var exportButton = document.getElementById("exportButton");
  var totalCount = document.getElementById("totalCount");
  var lastRadio = document.getElementById("lastRadio");
  var readingList = document.getElementById("readingList");

  function todayIso() {
    var now = new Date();
    var year = now.getFullYear();
    var month = String(now.getMonth() + 1).padStart(2, "0");
    var day = String(now.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function readStore() {
    try {
      var raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      return [];
    }
  }

  function writeStore(readings) {
    localStorage.setItem(storageKey, JSON.stringify(readings));
  }

  function normalizeRadio(value) {
    return value.trim().replace(/\s+/g, " ").toUpperCase();
  }

  function getLastForRadio(readings, radio) {
    for (var index = readings.length - 1; index >= 0; index -= 1) {
      if (readings[index].radio === radio) {
        return readings[index];
      }
    }
    return null;
  }

  function setStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = type ? "status " + type : "status";
  }

  function formatIndex(value) {
    return Number(value).toLocaleString("fr-FR", {
      maximumFractionDigits: 3
    });
  }

  function render() {
    var readings = readStore();
    var latest = readings[readings.length - 1];
    totalCount.textContent = String(readings.length);
    lastRadio.textContent = latest ? latest.radio : "-";
    readingList.replaceChildren();

    if (readings.length === 0) {
      var emptyItem = document.createElement("li");
      emptyItem.className = "empty-state";
      emptyItem.textContent = "Aucun releve";
      readingList.append(emptyItem);
      return;
    }

    readings.slice().reverse().slice(0, 12).forEach(function (reading) {
      var item = document.createElement("li");
      var main = document.createElement("span");
      var radio = document.createElement("span");
      var date = document.createElement("span");
      var readingIndex = document.createElement("span");

      main.className = "reading-main";
      radio.className = "reading-radio";
      date.className = "reading-date";
      readingIndex.className = "reading-index";

      radio.textContent = reading.radio;
      date.textContent = reading.date;
      readingIndex.textContent = formatIndex(reading.index);

      main.append(radio, date);
      item.append(main, readingIndex);
      readingList.append(item);
    });
  }

  function escapeCsvCell(value) {
    var text = String(value).replace(/"/g, "\"\"");
    return "\"" + text + "\"";
  }

  function exportCsv() {
    var readings = readStore();
    var rows = [["Date", "Radio", "Index"]].concat(
      readings.map(function (reading) {
        return [reading.date, reading.radio, reading.index];
      })
    );
    var csv = rows.map(function (row) {
      return row.map(escapeCsvCell).join(";");
    }).join("\r\n");
    var blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8"
    });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "index-compteur-radio-" + todayIso() + ".csv";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function handleSubmit(event) {
    event.preventDefault();

    var readings = readStore();
    var radio = normalizeRadio(radioInput.value);
    var parsedIndex = Number(indexInput.value);

    if (!radio || !Number.isFinite(parsedIndex)) {
      setStatus("Champs requis", "error");
      return;
    }

    var lastReading = getLastForRadio(readings, radio);
    if (lastReading && parsedIndex < Number(lastReading.index)) {
      setStatus("Index erroné", "error");
      return;
    }

    readings.push({
      date: todayIso(),
      radio: radio,
      index: parsedIndex,
      savedAt: new Date().toISOString()
    });

    writeStore(readings);
    dateInput.value = todayIso();
    radioInput.value = "";
    indexInput.value = "";
    radioInput.focus();
    setStatus("Index enregistre", "success");
    render();
  }

  dateInput.value = todayIso();
  form.addEventListener("submit", handleSubmit);
  exportButton.addEventListener("click", exportCsv);
  render();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("service-worker.js");
    });
  }
}());
