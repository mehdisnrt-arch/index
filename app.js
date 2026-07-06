(function () {
  "use strict";

  var storageKey = "index-compteur-radio-readings-v2";
  var oldStorageKey = "index-compteur-radio-readings-v1";
  var radioNames = [
    "Aswat",
    "Med Radio",
    "Medina FM",
    "Medi1",
    "Cap Radio",
    "Chada FM",
    "HIT RADIO",
    "MFM"
  ];
  var baselineIndexes = {
    "ASWAT": 4310,
    "MED RADIO": 3531,
    "MEDINA FM": 60049,
    "MEDI1": 7137,
    "CAP RADIO": 78734,
    "CHADA FM": 6511,
    "HIT RADIO": 6671,
    "MFM": 312562
  };
  var powerByRadio = {
    "Aswat": "0 W",
    "Med Radio": "467 W",
    "Medina FM": "494 W",
    "Medi1": "1030 W",
    "Cap Radio": "403 W",
    "Chada FM": "107",
    "HIT RADIO": "505 W",
    "MFM": "80 W"
  };
  var monthLabels = ["JAN", "FEV", "MAR", "AVR", "MAI", "JUN", "JUL", "AOUT", "SEP", "OCT", "NOV", "DEC"];

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
      if (raw) {
        return JSON.parse(raw);
      }

      var oldRaw = localStorage.getItem(oldStorageKey);
      if (!oldRaw) {
        return [];
      }

      var migrated = JSON.parse(oldRaw).map(function (reading) {
        return {
          date: reading.date,
          radio: radioLabel(reading.radio),
          index: Number(reading.index),
          savedAt: reading.savedAt || new Date().toISOString()
        };
      });
      writeStore(migrated);
      return migrated;
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

  function radioLabel(value) {
    var normalized = normalizeRadio(value);
    for (var index = 0; index < radioNames.length; index += 1) {
      if (normalizeRadio(radioNames[index]) === normalized) {
        return radioNames[index];
      }
    }
    return value.trim();
  }

  function getLastForRadio(readings, radio) {
    var normalizedRadio = normalizeRadio(radio);
    for (var index = readings.length - 1; index >= 0; index -= 1) {
      if (normalizeRadio(readings[index].radio) === normalizedRadio) {
        return readings[index];
      }
    }
    if (baselineIndexes[normalizedRadio] !== undefined) {
      return {
        radio: radio,
        index: baselineIndexes[normalizedRadio]
      };
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

  function escapeXml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function groupReadingsByMonth(readings) {
    var grouped = {};
    readings.forEach(function (reading) {
      if (!reading.date) {
        return;
      }
      var monthKey = reading.date.slice(0, 7);
      var dayKey = reading.date;
      var radio = radioLabel(reading.radio);
      grouped[monthKey] = grouped[monthKey] || {};
      grouped[monthKey][dayKey] = grouped[monthKey][dayKey] || {};
      grouped[monthKey][dayKey][radio] = reading.index;
    });
    return grouped;
  }

  function worksheetXml(monthKey, days) {
    var dateKeys = Object.keys(days).sort();
    var monthNumber = Number(monthKey.slice(5, 7));
    var sheetName = monthLabels[monthNumber - 1] || monthKey;
    var xml = "";

    xml += "<Worksheet ss:Name=\"" + escapeXml(sheetName) + "\"><Table ss:ExpandedColumnCount=\"9\">";
    xml += "<Column ss:Width=\"90\"/>";
    radioNames.forEach(function () {
      xml += "<Column ss:Width=\"82\"/>";
    });
    xml += "<Row/><Row/><Row/><Row/><Row/><Row/>";
    xml += "<Row><Cell ss:MergeAcross=\"8\" ss:StyleID=\"Title\"><Data ss:Type=\"String\">Releve du compteur d'electricite de Radio</Data></Cell></Row>";
    xml += "<Row><Cell ss:MergeAcross=\"8\" ss:StyleID=\"Subtitle\"><Data ss:Type=\"String\">Au centre emetteur de Figuig</Data></Cell></Row>";
    xml += "<Row/><Row/>";
    xml += "<Row ss:StyleID=\"Header\"><Cell><Data ss:Type=\"String\">Date</Data></Cell>";
    radioNames.forEach(function (radio) {
      xml += "<Cell><Data ss:Type=\"String\">" + escapeXml(radio) + "</Data></Cell>";
    });
    xml += "</Row>";

    dateKeys.forEach(function (dateKey) {
      xml += "<Row><Cell ss:StyleID=\"Date\"><Data ss:Type=\"DateTime\">" + escapeXml(dateKey) + "T00:00:00.000</Data></Cell>";
      radioNames.forEach(function (radio) {
        var value = days[dateKey][radio];
        if (value === undefined || value === "") {
          xml += "<Cell ss:StyleID=\"Cell\"/>";
        } else {
          xml += "<Cell ss:StyleID=\"Cell\"><Data ss:Type=\"Number\">" + escapeXml(value) + "</Data></Cell>";
        }
      });
      xml += "</Row>";
    });

    xml += "<Row ss:StyleID=\"Footer\"><Cell><Data ss:Type=\"String\">Puissance </Data></Cell>";
    radioNames.forEach(function (radio) {
      xml += "<Cell><Data ss:Type=\"String\">" + escapeXml(powerByRadio[radio] || "") + "</Data></Cell>";
    });
    xml += "</Row>";
    xml += "</Table></Worksheet>";
    return xml;
  }

  function exportExcel() {
    var readings = readStore();
    var grouped = groupReadingsByMonth(readings);
    var monthKeys = Object.keys(grouped).sort();

    if (monthKeys.length === 0) {
      var currentMonth = todayIso().slice(0, 7);
      grouped[currentMonth] = {};
      monthKeys = [currentMonth];
    }

    var workbook = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";
    workbook += "<?mso-application progid=\"Excel.Sheet\"?>";
    workbook += "<Workbook xmlns=\"urn:schemas-microsoft-com:office:spreadsheet\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:x=\"urn:schemas-microsoft-com:office:excel\" xmlns:ss=\"urn:schemas-microsoft-com:office:spreadsheet\">";
    workbook += "<Styles>";
    workbook += "<Style ss:ID=\"Default\" ss:Name=\"Normal\"><Alignment ss:Vertical=\"Center\"/><Font ss:FontName=\"Calibri\" ss:Size=\"11\"/></Style>";
    workbook += "<Style ss:ID=\"Title\"><Alignment ss:Horizontal=\"Center\"/><Font ss:Bold=\"1\" ss:Size=\"14\"/></Style>";
    workbook += "<Style ss:ID=\"Subtitle\"><Alignment ss:Horizontal=\"Center\"/><Font ss:Bold=\"1\" ss:Size=\"12\"/></Style>";
    workbook += "<Style ss:ID=\"Header\"><Alignment ss:Horizontal=\"Center\"/><Borders><Border ss:Position=\"Bottom\" ss:LineStyle=\"Continuous\" ss:Weight=\"1\"/><Border ss:Position=\"Left\" ss:LineStyle=\"Continuous\" ss:Weight=\"1\"/><Border ss:Position=\"Right\" ss:LineStyle=\"Continuous\" ss:Weight=\"1\"/><Border ss:Position=\"Top\" ss:LineStyle=\"Continuous\" ss:Weight=\"1\"/></Borders><Font ss:Bold=\"1\"/></Style>";
    workbook += "<Style ss:ID=\"Cell\"><Alignment ss:Horizontal=\"Center\"/><Borders><Border ss:Position=\"Bottom\" ss:LineStyle=\"Continuous\" ss:Weight=\"1\"/><Border ss:Position=\"Left\" ss:LineStyle=\"Continuous\" ss:Weight=\"1\"/><Border ss:Position=\"Right\" ss:LineStyle=\"Continuous\" ss:Weight=\"1\"/><Border ss:Position=\"Top\" ss:LineStyle=\"Continuous\" ss:Weight=\"1\"/></Borders></Style>";
    workbook += "<Style ss:ID=\"Date\"><Alignment ss:Horizontal=\"Center\"/><Borders><Border ss:Position=\"Bottom\" ss:LineStyle=\"Continuous\" ss:Weight=\"1\"/><Border ss:Position=\"Left\" ss:LineStyle=\"Continuous\" ss:Weight=\"1\"/><Border ss:Position=\"Right\" ss:LineStyle=\"Continuous\" ss:Weight=\"1\"/><Border ss:Position=\"Top\" ss:LineStyle=\"Continuous\" ss:Weight=\"1\"/></Borders><NumberFormat ss:Format=\"Short Date\"/></Style>";
    workbook += "<Style ss:ID=\"Footer\"><Alignment ss:Horizontal=\"Center\"/><Borders><Border ss:Position=\"Bottom\" ss:LineStyle=\"Continuous\" ss:Weight=\"1\"/><Border ss:Position=\"Left\" ss:LineStyle=\"Continuous\" ss:Weight=\"1\"/><Border ss:Position=\"Right\" ss:LineStyle=\"Continuous\" ss:Weight=\"1\"/><Border ss:Position=\"Top\" ss:LineStyle=\"Continuous\" ss:Weight=\"1\"/></Borders><Font ss:Bold=\"1\"/></Style>";
    workbook += "</Styles>";
    monthKeys.forEach(function (monthKey) {
      workbook += worksheetXml(monthKey, grouped[monthKey]);
    });
    workbook += "</Workbook>";

    var blob = new Blob(["\uFEFF" + workbook], {
      type: "application/vnd.ms-excel;charset=utf-8"
    });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "index-compteur-radio-" + todayIso() + ".xls";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function handleSubmit(event) {
    event.preventDefault();

    var readings = readStore();
    var radio = radioLabel(radioInput.value);
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
    setStatus("Index enregistré", "success");
    render();
  }

  dateInput.value = todayIso();
  form.addEventListener("submit", handleSubmit);
  exportButton.addEventListener("click", exportExcel);
  render();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("service-worker.js");
    });
  }
}());
