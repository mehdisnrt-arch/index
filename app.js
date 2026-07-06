(function () {
  "use strict";

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
  var adminRefreshTimer = null;
  var adminRows = [];

  // Google Sheets is the source of truth. Phones do not keep the main database.
  var config = window.INDEX_APP_CONFIG || {};
  var scriptUrl = (config.googleScriptUrl || "").trim();
  var isAdmin = new URLSearchParams(window.location.search).get("admin") === "1" || window.location.hash === "#admin";

  var form = document.getElementById("readingForm");
  var dateInput = document.getElementById("dateInput");
  var radioInput = document.getElementById("radioInput");
  var indexInput = document.getElementById("indexInput");
  var statusMessage = document.getElementById("statusMessage");
  var refreshButton = document.getElementById("refreshButton");
  var exportButton = document.getElementById("exportButton");
  var adminPanel = document.getElementById("adminPanel");
  var adminKeyInput = document.getElementById("adminKeyInput");
  var totalCount = document.getElementById("totalCount");
  var lastSync = document.getElementById("lastSync");
  var adminTableBody = document.getElementById("adminTableBody");

  function todayIso() {
    var now = new Date();
    var year = now.getFullYear();
    var month = String(now.getMonth() + 1).padStart(2, "0");
    var day = String(now.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function normalizeRadio(value) {
    return String(value || "").trim().replace(/\s+/g, " ").toUpperCase();
  }

  function radioLabel(value) {
    var normalized = normalizeRadio(value);
    for (var index = 0; index < radioNames.length; index += 1) {
      if (normalizeRadio(radioNames[index]) === normalized) {
        return radioNames[index];
      }
    }
    return String(value || "").trim();
  }

  function setStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = type ? "status " + type : "status";
  }

  function setBusy(busy) {
    form.querySelectorAll("input, select, button").forEach(function (control) {
      control.disabled = busy;
    });
  }

  function api(action, params) {
    return new Promise(function (resolve, reject) {
      if (!scriptUrl || scriptUrl.indexOf("PASTE_") === 0) {
        reject(new Error("Google Apps Script non configuré"));
        return;
      }

      var callbackName = "__indexRadio" + Date.now() + Math.random().toString(16).slice(2);
      var url = new URL(scriptUrl);
      var script = document.createElement("script");
      var timer = window.setTimeout(function () {
        cleanup();
        reject(new Error("Connexion Google Sheets impossible"));
      }, 15000);

      function cleanup() {
        window.clearTimeout(timer);
        delete window[callbackName];
        script.remove();
      }

      window[callbackName] = function (payload) {
        cleanup();
        if (payload && payload.ok) {
          resolve(payload);
          return;
        }
        reject(new Error((payload && payload.error) || "Erreur Google Sheets"));
      };

      url.searchParams.set("action", action);
      url.searchParams.set("callback", callbackName);
      url.searchParams.set("_", String(Date.now()));
      Object.keys(params || {}).forEach(function (key) {
        url.searchParams.set(key, params[key]);
      });
      script.onerror = function () {
        cleanup();
        reject(new Error("Connexion Google Sheets impossible"));
      };
      script.src = url.toString();
      document.head.append(script);
    });
  }

  function formatIndex(value) {
    return Number(value).toLocaleString("fr-FR", {
      maximumFractionDigits: 3
    });
  }

  function formatTime(date) {
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  function handleSubmit(event) {
    event.preventDefault();

    var radio = radioLabel(radioInput.value);
    var parsedIndex = Number(indexInput.value);

    if (!radio || !Number.isFinite(parsedIndex)) {
      setStatus("Champs requis", "error");
      return;
    }

    setBusy(true);
    setStatus("Enregistrement...", "");

    api("add", {
        date: todayIso(),
        radio: radio,
        index: parsedIndex
    }).then(function () {
      dateInput.value = todayIso();
      radioInput.value = "";
      indexInput.value = "";
      setStatus("Index enregistré", "success");
      if (isAdmin) {
        refreshAdminData();
      }
    }).catch(function (error) {
      setStatus(error.message === "Index erroné" ? "Index erroné" : error.message, "error");
    }).finally(function () {
      setBusy(false);
      radioInput.focus();
    });
  }

  function requireAdminKey() {
    var key = adminKeyInput.value.trim();
    if (!key) {
      setStatus("Code admin requis", "error");
      adminKeyInput.focus();
      return "";
    }
    return key;
  }

  function refreshAdminData() {
    if (!isAdmin) {
      setStatus("Actualisé", "success");
      return Promise.resolve(false);
    }

    var adminKey = requireAdminKey();
    if (!adminKey) {
      return Promise.resolve(false);
    }

    refreshButton.disabled = true;
    return api("list", {
      adminKey: adminKey
    }).then(function (payload) {
      adminRows = payload.data || [];
      renderAdminRows();
      totalCount.textContent = String(adminRows.length);
      lastSync.textContent = formatTime(new Date());
      setStatus("Actualisé", "success");
      return true;
    }).catch(function (error) {
      setStatus(error.message, "error");
      return false;
    }).finally(function () {
      refreshButton.disabled = false;
    });
  }

  function makeRadioSelect(value) {
    var select = document.createElement("select");
    radioNames.forEach(function (radio) {
      var option = document.createElement("option");
      option.value = radio;
      option.textContent = radio;
      if (radio === radioLabel(value)) {
        option.selected = true;
      }
      select.append(option);
    });
    return select;
  }

  function renderAdminRows() {
    adminTableBody.replaceChildren();

    if (adminRows.length === 0) {
      var emptyRow = document.createElement("tr");
      var emptyCell = document.createElement("td");
      emptyCell.colSpan = 5;
      emptyCell.className = "empty-table";
      emptyCell.textContent = "Aucun relevé";
      emptyRow.append(emptyCell);
      adminTableBody.append(emptyRow);
      return;
    }

    adminRows.slice().reverse().forEach(function (reading) {
      var row = document.createElement("tr");
      var dateCell = document.createElement("td");
      var radioCell = document.createElement("td");
      var indexCell = document.createElement("td");
      var savedCell = document.createElement("td");
      var actionsCell = document.createElement("td");
      var dateEdit = document.createElement("input");
      var radioEdit = makeRadioSelect(reading.radio);
      var indexEdit = document.createElement("input");
      var saveButton = document.createElement("button");
      var deleteButton = document.createElement("button");

      dateEdit.type = "date";
      dateEdit.value = reading.date || "";
      indexEdit.type = "number";
      indexEdit.inputMode = "decimal";
      indexEdit.step = "0.001";
      indexEdit.value = reading.index;
      saveButton.type = "button";
      deleteButton.type = "button";
      saveButton.className = "table-button save";
      deleteButton.className = "table-button delete";
      saveButton.textContent = "OK";
      deleteButton.textContent = "Supprimer";
      savedCell.textContent = reading.createdAt || "";

      saveButton.addEventListener("click", function () {
        updateReading(reading.id, dateEdit.value, radioEdit.value, indexEdit.value);
      });
      deleteButton.addEventListener("click", function () {
        deleteReading(reading.id);
      });

      dateCell.append(dateEdit);
      radioCell.append(radioEdit);
      indexCell.append(indexEdit);
      actionsCell.append(saveButton, deleteButton);
      row.append(dateCell, radioCell, indexCell, savedCell, actionsCell);
      adminTableBody.append(row);
    });
  }

  function updateReading(id, date, radio, index) {
    var adminKey = requireAdminKey();
    var parsedIndex = Number(index);
    if (!adminKey || !date || !radio || !Number.isFinite(parsedIndex)) {
      setStatus("Champs requis", "error");
      return;
    }

    api("edit", {
      adminKey: adminKey,
      id: id,
      date: date,
      radio: radioLabel(radio),
      index: parsedIndex
    }).then(function () {
      setStatus("Modifié", "success");
      return refreshAdminData();
    }).catch(function (error) {
      setStatus(error.message, "error");
    });
  }

  function deleteReading(id) {
    var adminKey = requireAdminKey();
    if (!adminKey) {
      return;
    }
    if (!window.confirm("Supprimer cet index ?")) {
      return;
    }

    api("delete", {
      adminKey: adminKey,
      id: id
    }).then(function () {
      setStatus("Supprimé", "success");
      return refreshAdminData();
    }).catch(function (error) {
      setStatus(error.message, "error");
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
    var rows = adminRows.slice();
    var grouped = groupReadingsByMonth(rows);
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

  function init() {
    dateInput.value = todayIso();
    adminPanel.hidden = !isAdmin;
    exportButton.hidden = !isAdmin;

    form.addEventListener("submit", handleSubmit);
    refreshButton.addEventListener("click", refreshAdminData);
    exportButton.addEventListener("click", function () {
      if (adminRows.length > 0) {
        exportExcel();
        return;
      }
      refreshAdminData().then(function (loaded) {
        if (loaded) {
          exportExcel();
        }
      });
    });

    if (!scriptUrl || scriptUrl.indexOf("PASTE_") === 0) {
      setStatus("Configurer Google Apps Script", "error");
    }

    if (isAdmin) {
      adminRefreshTimer = window.setInterval(function () {
        if (adminKeyInput.value.trim()) {
          refreshAdminData();
        }
      }, 10000);
    }

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("service-worker.js");
      });
    }
  }

  window.addEventListener("beforeunload", function () {
    if (adminRefreshTimer) {
      window.clearInterval(adminRefreshTimer);
    }
  });

  init();
}());
