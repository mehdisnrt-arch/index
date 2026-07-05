const STORAGE_KEY = "index-compteur-radio-v2";

const RADIOS = [
  { name: "Aswat", power: "12 W" },
  { name: "Med Radio", power: "467 W" },
  { name: "Medina FM", power: "494 W" },
  { name: "Medi1", power: "1030 W" },
  { name: "Cap Radio", power: "403 W" },
  { name: "Chada FM", power: "107 W" },
  { name: "HIT RADIO", power: "505 W" },
  { name: "MFM", power: "80 W" }
];

const MONTHS = ["JAN", "FEV", "MAR", "AVR", "MAI", "JUN", "JUL", "AOU", "SEP", "OCT", "NOV", "DEC"];

const form = document.getElementById("readingForm");
const dateInput = document.getElementById("date");
const dateDisplay = document.getElementById("dateDisplay");
const radioInput = document.getElementById("radio");
const indexInput = document.getElementById("indexValue");
const previousInfo = document.getElementById("previousInfo");
const messageBox = document.getElementById("message");
const recordsList = document.getElementById("recordsList");
const emptyState = document.getElementById("emptyState");
const countBadge = document.getElementById("countBadge");
const searchInput = document.getElementById("search");
const todayBadge = document.getElementById("todayBadge");
const sheetPreview = document.getElementById("sheetPreview");
const offlineStatus = document.getElementById("offlineStatus");

let records = loadRecords();

function todayISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(iso) {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function monthKey(iso) {
  return iso.slice(0, 7);
}

function monthLabel(key) {
  const [year, month] = key.split("-").map(Number);
  return `${MONTHS[month - 1]} ${year}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function setMessage(text, type = "") {
  messageBox.textContent = text;
  messageBox.className = `message ${type}`.trim();
}

function fillRadioSelect() {
  radioInput.innerHTML = '<option value="">Choisir radio</option>';
  RADIOS.forEach((radio) => {
    const option = document.createElement("option");
    option.value = radio.name;
    option.textContent = radio.name;
    radioInput.appendChild(option);
  });
}

function resetDate() {
  const iso = todayISO();
  dateInput.value = iso;
  dateDisplay.value = formatDate(iso);
  todayBadge.textContent = formatDate(iso);
}

function getLastRecordForRadio(radioName, beforeDate = null) {
  return records
    .filter((record) => record.radio === radioName)
    .filter((record) => !beforeDate || record.date < beforeDate)
    .sort((a, b) => {
      if (a.date === b.date) return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      return a.date.localeCompare(b.date);
    })
    .at(-1);
}

function updatePreviousInfo() {
  const radioName = radioInput.value;
  if (!radioName) {
    previousInfo.textContent = "Dernier index: —";
    return;
  }
  const last = getLastRecordForRadio(radioName, dateInput.value) || getLastRecordForRadio(radioName);
  previousInfo.textContent = last
    ? `Dernier index ${radioName}: ${last.index} (${formatDate(last.date)})`
    : `Dernier index ${radioName}: —`;
}

function findSameDayRecord(date, radio) {
  return records.find((record) => record.date === date && record.radio === radio);
}

function validateEntry(date, radio, index) {
  if (!radio) return "Choisir radio";
  if (Number.isNaN(index)) return "Index obligatoire";
  if (index < 0) return "Index erroné";

  const sameDay = findSameDayRecord(date, radio);
  if (sameDay && index < Number(sameDay.index)) {
    return "Index erroné";
  }

  const previous = getLastRecordForRadio(radio, date);
  if (previous && index < Number(previous.index)) {
    return "Index erroné";
  }

  return "";
}

function handleSubmit(event) {
  event.preventDefault();
  const date = dateInput.value;
  const radio = radioInput.value;
  const index = Number(indexInput.value);
  const error = validateEntry(date, radio, index);

  if (error) {
    setMessage(error, "error");
    return;
  }

  const sameDay = findSameDayRecord(date, radio);
  if (sameDay) {
    const confirmReplace = confirm(`Une lecture existe déjà pour ${radio} le ${formatDate(date)}. Remplacer l'index ?`);
    if (!confirmReplace) return;
    sameDay.index = index;
    sameDay.updatedAt = new Date().toISOString();
  } else {
    records.push({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      date,
      radio,
      index,
      createdAt: new Date().toISOString()
    });
  }

  records.sort((a, b) => a.date.localeCompare(b.date) || a.radio.localeCompare(b.radio));
  saveRecords();
  indexInput.value = "";
  setMessage("Lecture enregistrée", "success");
  updatePreviousInfo();
  renderAll();
}

function editRecord(id) {
  const record = records.find((item) => item.id === id);
  if (!record) return;
  radioInput.value = record.radio;
  indexInput.value = record.index;
  setMessage(`Modification: ${record.radio} ${formatDate(record.date)}`, "success");
  updatePreviousInfo();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteRecord(id) {
  const record = records.find((item) => item.id === id);
  if (!record) return;
  const ok = confirm(`Supprimer ${record.radio} du ${formatDate(record.date)} ?`);
  if (!ok) return;
  records = records.filter((item) => item.id !== id);
  saveRecords();
  setMessage("Lecture supprimée", "success");
  renderAll();
}

function filteredRecords() {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) return [...records];
  return records.filter((record) => {
    return record.radio.toLowerCase().includes(query)
      || formatDate(record.date).includes(query)
      || record.date.includes(query)
      || monthLabel(monthKey(record.date)).toLowerCase().includes(query);
  });
}

function renderRecords() {
  const list = filteredRecords().sort((a, b) => b.date.localeCompare(a.date) || a.radio.localeCompare(b.radio));
  recordsList.innerHTML = "";
  countBadge.textContent = String(list.length);
  emptyState.style.display = list.length ? "none" : "block";

  list.forEach((record) => {
    const div = document.createElement("article");
    div.className = "record";
    div.innerHTML = `
      <div class="record-top">
        <div class="record-radio">${escapeHtml(record.radio)}</div>
        <div class="record-date">${escapeHtml(formatDate(record.date))}</div>
      </div>
      <div class="record-index">${escapeHtml(record.index)}</div>
      <div class="record-actions">
        <button type="button" data-edit="${escapeHtml(record.id)}">Modifier</button>
        <button type="button" class="danger ghost" data-delete="${escapeHtml(record.id)}">Supprimer</button>
      </div>
    `;
    recordsList.appendChild(div);
  });
}

function buildMonthGrid(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  const daysCount = new Date(year, monthNumber, 0).getDate();
  const byDateRadio = new Map();

  records
    .filter((record) => monthKey(record.date) === month)
    .forEach((record) => {
      byDateRadio.set(`${record.date}|${record.radio}`, record.index);
    });

  const rows = [];
  for (let day = 1; day <= daysCount; day += 1) {
    const date = `${year}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    rows.push({
      date,
      values: RADIOS.map((radio) => byDateRadio.get(`${date}|${radio.name}`) ?? "")
    });
  }
  return rows;
}

function currentOrLatestMonth() {
  if (!records.length) return monthKey(todayISO());
  return [...new Set(records.map((record) => monthKey(record.date)))].sort().at(-1);
}

function renderPreview() {
  const month = currentOrLatestMonth();
  const rows = buildMonthGrid(month);
  const visibleRows = rows.slice(0, 31);
  const headers = RADIOS.map((radio, index) => `<th class="${index >= 3 ? "strong-yellow" : ""}">${escapeHtml(radio.name)}</th>`).join("");
  const body = visibleRows.map((row) => `
    <tr>
      <td>${escapeHtml(formatDate(row.date).slice(0, 5))}</td>
      ${row.values.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}
    </tr>`).join("");
  const power = RADIOS.map((radio) => `<td>${escapeHtml(radio.power)}</td>`).join("");

  sheetPreview.innerHTML = `
    <table class="preview-table">
      <tr class="title"><td colspan="9">Relevé du compteur d'électricité de Radio</td></tr>
      <tr class="subtitle"><td colspan="9">Au centre émetteur de Figuig - ${escapeHtml(monthLabel(month))}</td></tr>
      <tr class="blank"><td colspan="9"></td></tr>
      <tr><th>Date</th>${headers}</tr>
      ${body}
      <tr class="power"><td>Puissance</td>${power}</tr>
    </table>`;
}

function renderAll() {
  renderRecords();
  renderPreview();
}

function worksheetName(month) {
  const [, monthNumber] = month.split("-").map(Number);
  return MONTHS[monthNumber - 1];
}

function xmlCell(value, style = "Body", type = "Number") {
  if (value === "" || value === null || value === undefined) {
    return `<Cell ss:StyleID="${style}"/>`;
  }
  return `<Cell ss:StyleID="${style}"><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
}

function xmlDateCell(iso) {
  return `<Cell ss:StyleID="Date"><Data ss:Type="DateTime">${iso}T00:00:00.000</Data></Cell>`;
}

function createWorksheetXml(month) {
  const rows = buildMonthGrid(month);
  const safeName = worksheetName(month);
  const headerCells = ["Date", ...RADIOS.map((radio) => radio.name)]
    .map((text, index) => xmlCell(text, index >= 4 ? "HeaderStrong" : "HeaderSoft", "String"))
    .join("");
  const dataRows = rows.map((row) => {
    const cells = [xmlDateCell(row.date), ...row.values.map((value) => xmlCell(value))].join("");
    return `<Row ss:AutoFitHeight="0" ss:Height="18">${cells}</Row>`;
  }).join("");
  const powerCells = [xmlCell("Puissance", "Power", "String"), ...RADIOS.map((radio) => xmlCell(radio.power, "Power", "String"))].join("");

  return `
  <Worksheet ss:Name="${escapeXml(safeName)}">
    <Table ss:ExpandedColumnCount="9" ss:ExpandedRowCount="${rows.length + 12}" x:FullColumns="1" x:FullRows="1">
      <Column ss:AutoFitWidth="0" ss:Width="95"/>
      <Column ss:AutoFitWidth="0" ss:Width="96"/>
      <Column ss:AutoFitWidth="0" ss:Width="96"/>
      <Column ss:AutoFitWidth="0" ss:Width="96"/>
      <Column ss:AutoFitWidth="0" ss:Width="96"/>
      <Column ss:AutoFitWidth="0" ss:Width="96"/>
      <Column ss:AutoFitWidth="0" ss:Width="96"/>
      <Column ss:AutoFitWidth="0" ss:Width="105"/>
      <Column ss:AutoFitWidth="0" ss:Width="96"/>
      <Row ss:Height="18"/><Row ss:Height="18"/><Row ss:Height="18"/><Row ss:Height="18"/><Row ss:Height="18"/><Row ss:Height="18"/>
      <Row ss:AutoFitHeight="0" ss:Height="24"><Cell ss:MergeAcross="8" ss:StyleID="Title"><Data ss:Type="String">Relevé du compteur d'électricité de Radio</Data></Cell></Row>
      <Row ss:AutoFitHeight="0" ss:Height="24"><Cell ss:MergeAcross="8" ss:StyleID="SubTitle"><Data ss:Type="String">Au centre émetteur de Figuig</Data></Cell></Row>
      <Row ss:Height="18"/><Row ss:Height="18"/>
      <Row ss:AutoFitHeight="0" ss:Height="20">${headerCells}</Row>
      ${dataRows}
      <Row ss:AutoFitHeight="0" ss:Height="20">${powerCells}</Row>
    </Table>
    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
      <PageSetup>
        <Layout x:Orientation="Landscape"/>
      </PageSetup>
      <FitToPage/>
      <Print>
        <FitWidth>1</FitWidth>
        <FitHeight>1</FitHeight>
      </Print>
      <Selected/>
      <Panes>
        <Pane><Number>3</Number><ActiveRow>11</ActiveRow><ActiveCol>1</ActiveCol></Pane>
      </Panes>
      <ProtectObjects>False</ProtectObjects>
      <ProtectScenarios>False</ProtectScenarios>
    </WorksheetOptions>
  </Worksheet>`;
}

function createExcelXml() {
  const months = [...new Set(records.map((record) => monthKey(record.date)))].sort();
  const exportMonths = months.length ? months : [monthKey(todayISO())];
  const sheets = exportMonths.map(createWorksheetXml).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>Index Compteur Radio</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="14"/>
  </Style>
  <Style ss:ID="Title">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="16" ss:Color="#003366"/>
  </Style>
  <Style ss:ID="SubTitle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#003366"/>
  </Style>
  <Style ss:ID="HeaderSoft">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1" ss:Color="#003366"/>
   <Interior ss:Color="#FFFF99" ss:Pattern="Solid"/>
   <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders>
  </Style>
  <Style ss:ID="HeaderStrong">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1" ss:Color="#003366"/>
   <Interior ss:Color="#FFFF00" ss:Pattern="Solid"/>
   <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders>
  </Style>
  <Style ss:ID="Body">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="14"/>
   <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders>
  </Style>
  <Style ss:ID="Date">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="14"/>
   <NumberFormat ss:Format="m/d/yy"/>
   <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders>
  </Style>
  <Style ss:ID="Power">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="12"/>
   <Interior ss:Color="#F8C08A" ss:Pattern="Solid"/>
   <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders>
  </Style>
 </Styles>
 ${sheets}
</Workbook>`;
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportFicheExcel() {
  const xml = createExcelXml();
  const filename = `fiche-index-radio-${todayISO()}.xls`;
  downloadFile(filename, xml, "application/vnd.ms-excel;charset=utf-8");
}

function backupJson() {
  const payload = {
    app: "Index Compteur Radio",
    version: 2,
    exportedAt: new Date().toISOString(),
    radios: RADIOS,
    records
  };
  downloadFile(`backup-index-radio-${todayISO()}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
}

function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const importedRecords = Array.isArray(parsed) ? parsed : parsed.records;
      if (!Array.isArray(importedRecords)) throw new Error("Invalid backup");
      const normalized = importedRecords
        .filter((item) => item && item.date && item.radio && item.index !== undefined)
        .map((item) => ({
          id: item.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())),
          date: item.date,
          radio: item.radio,
          index: Number(item.index),
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || undefined
        }));
      records = normalized;
      saveRecords();
      setMessage("Backup importé", "success");
      renderAll();
    } catch (error) {
      console.error(error);
      setMessage("Backup invalide", "error");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function clearAllRecords() {
  if (!records.length) return;
  const ok = confirm("Effacer toutes les lectures ? Cette action est irréversible.");
  if (!ok) return;
  records = [];
  saveRecords();
  setMessage("Toutes les lectures sont effacées", "success");
  renderAll();
}

function setOfflineStatus() {
  offlineStatus.textContent = navigator.onLine ? "Prêt" : "Hors ligne";
}

recordsList.addEventListener("click", (event) => {
  const editId = event.target.getAttribute("data-edit");
  const deleteId = event.target.getAttribute("data-delete");
  if (editId) editRecord(editId);
  if (deleteId) deleteRecord(deleteId);
});

form.addEventListener("submit", handleSubmit);
radioInput.addEventListener("change", updatePreviousInfo);
searchInput.addEventListener("input", renderRecords);
document.getElementById("exportFiche").addEventListener("click", exportFicheExcel);
document.getElementById("backupJson").addEventListener("click", backupJson);
document.getElementById("importJson").addEventListener("change", importJson);
document.getElementById("clearAll").addEventListener("click", clearAllRecords);
window.addEventListener("online", setOfflineStatus);
window.addEventListener("offline", setOfflineStatus);

fillRadioSelect();
resetDate();
updatePreviousInfo();
setOfflineStatus();
renderAll();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(console.error);
  });
}
