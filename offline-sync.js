const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby4U5r2sDTctuMDIz_L56FfPKpe8UHY1mAf-vP_DJObg9UdHcsuUao32OEntzo2HGI/exec";
const SECRET_TOKEN = "MY_STOCK_SECRET_1234"; // ต้องตรงกับใน Apps Script

const DB_NAME = "StockCounterDB";
const STORE_NAME = "pending_counts";

function generateUUID() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Date.now() + "-" + Math.random().toString(36).substring(2, 9);
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

// 1. บันทึกการนับสต็อกลงเครื่อง (ใช้ตอน Offline)
async function saveOfflineCount({ staffName, itemCode, itemName, qty }) {
  const db = await openDB();
  const record = {
    id: generateUUID(),
    staffName: staffName,
    itemCode: itemCode,
    itemName: itemName,
    qty: qty,
    countedAt: new Date().toLocaleString("th-TH")
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add(record);
    tx.oncomplete = () => resolve(record);
    tx.onerror = (e) => reject(e.target.error);
  });
}

// 2. ดึงข้อมูลที่รออัปโหลดทั้งหมด
async function getPendingCounts() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

// 3. ลบเฉพาะรายการที่อัปโหลดขึ้น Sheet สำเร็จแล้ว
async function deleteSyncedItems(ids) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    ids.forEach((id) => store.delete(id));
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

// 4. ส่งข้อมูลทั้งหมดขึ้น Google Sheets
async function syncToGoogleSheet() {
  if (!navigator.onLine) {
    alert("ไม่มีอินเทอร์เน็ต กรุณาเชื่อมต่อเน็ตก่อนกดอัปโหลด");
    return false;
  }

  const items = await getPendingCounts();
  if (items.length === 0) {
    alert("ไม่มีรายการค้างส่ง");
    return true;
  }

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        token: SECRET_TOKEN,
        items: items
      })
    });

    const result = await response.json();
    if (result.success) {
      await deleteSyncedItems(result.syncedIds);
      alert(`อัปโหลดขึ้น Sheet สำเร็จ ${result.syncedIds.length} รายการ!`);
      return true;
    } else {
      alert("เกิดข้อผิดพลาด: " + result.error);
      return false;
    }
  } catch (err) {
    alert("ส่งข้อมูลไม่สำเร็จ: " + err.message);
    return false;
  }
}
