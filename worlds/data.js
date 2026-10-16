// ============================================================
//  WORLDS DATA: the only place the game gets users, friends and planets from.
//
//  Demo version: no server. The starting data comes from worlds/users/*.json,
//  and after that everything lives in this browser:
//    - profiles, friends and planet settings in localStorage
//    - uploaded photos (full size + thumbnail) in IndexedDB
//  Later this file gets swapped for calls to a real server
//  (Cloudflare Worker + D1 + R2) and the game code doesn't change.
// ============================================================

const USERS_DIR = new URL("users/", import.meta.url);
const STATE_KEY = "worlds-demo-state-v2";
const FULL_MAX = [1920, 1080];      // uploaded photos are shrunk to fit inside this
const THUMB_WIDTH = 480;            // the small copy the planet tiles use

let state = null;                   // { users: { id: { id, name, code, avatar, friends, planet } } }
let memoryOnly = false;             // true if the browser won't let us save (private mode etc.)

async function loadState() {
  if (state) return state;
  try { state = JSON.parse(localStorage.getItem(STATE_KEY)); } catch (e) { state = null; }
  if (!state || !state.users) {
    // first visit: start from the demo users in worlds/users/
    const ids = await (await fetch(new URL("index.json", USERS_DIR))).json();
    const users = await Promise.all(ids.map(id => fetch(new URL(id + ".json", USERS_DIR)).then(r => r.json())));
    state = { users: {} };
    for (const u of users) {
      u.planet.photos = (u.planet.photos || []).map(p => typeof p === "string" ? { id: p, src: p, caption: "" } : p);
      state.users[u.id] = u;
    }
    persist();
  }
  return state;
}
function persist() {
  if (memoryOnly) return;
  try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) { memoryOnly = true; }
}
const profileOf = u => u && ({ id: u.id, name: u.name, code: u.code, avatar: u.avatar || {}, friends: [...(u.friends || [])] });
const copy = o => JSON.parse(JSON.stringify(o));

// ---------- users and friends ----------
export async function listUsers() {
  const s = await loadState();
  return Object.values(s.users).map(u => ({ id: u.id, name: u.name }));
}
export async function getUser(userId) {
  const s = await loadState();
  return profileOf(s.users[userId]) || null;
}
export async function getFriends(userId) {
  const s = await loadState(), u = s.users[userId];
  return u ? (u.friends || []).map(id => profileOf(s.users[id])).filter(Boolean) : [];
}
// add a friend by their friend code (both people become friends). Returns the new friend's profile.
export async function addFriend(userId, code) {
  const s = await loadState(), me = s.users[userId];
  const clean = String(code || "").trim().toUpperCase();
  const other = Object.values(s.users).find(u => u.code === clean);
  if (!other) throw new Error("No one has the code " + (clean || "(empty)") + ".");
  if (other.id === userId) throw new Error("That's your own code.");
  if (me.friends.includes(other.id)) throw new Error(other.name + " is already your friend.");
  me.friends.push(other.id);
  if (!other.friends.includes(userId)) other.friends.push(userId);
  persist();
  return profileOf(other);
}
export async function removeFriend(userId, friendId) {
  const s = await loadState();
  const a = s.users[userId], b = s.users[friendId];
  if (a) a.friends = a.friends.filter(id => id !== friendId);
  if (b) b.friends = b.friends.filter(id => id !== userId);
  persist();
}

// ---------- planets ----------
// The planet description with each photo ready to show: { id, file (full size), thumb (small), caption }
export async function getPlanet(userId) {
  const s = await loadState(), u = s.users[userId];
  if (!u) return null;
  const planet = copy(u.planet);
  planet.photos = await Promise.all(planet.photos.map(resolvePhoto));
  planet.photos = planet.photos.filter(Boolean);
  return planet;
}
// save planet settings (name, glow, trail, biomes, decorations...). Photos are changed with addPhoto / deletePhoto.
export async function savePlanet(userId, changes) {
  const s = await loadState(), u = s.users[userId];
  const { photos, ...rest } = copy(changes);
  Object.assign(u.planet, rest);
  persist();
}

// ---------- photos ----------
// shrink the picked file to 1920x1080 max plus a 480 px wide thumbnail, store both, add it to the planet
export async function addPhoto(userId, file) {
  const s = await loadState(), u = s.users[userId];
  let bitmap;
  try { bitmap = await createImageBitmap(file); }
  catch (e) { throw new Error(file.name + " isn't an image this browser can read (try JPG or PNG)."); }
  const full = await shrink(bitmap, Math.min(1, FULL_MAX[0] / bitmap.width, FULL_MAX[1] / bitmap.height), 0.88);
  const thumb = await shrink(bitmap, Math.min(1, THUMB_WIDTH / bitmap.width), 0.8);
  bitmap.close && bitmap.close();
  const id = "up-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  await idb("readwrite", st => st.put({ id, full, thumb }));
  const entry = { id, stored: true, caption: file.name.replace(/\.[^.]+$/, "") };
  u.planet.photos.push(entry);
  persist();
  return resolvePhoto(entry);
}
export async function deletePhoto(userId, photoId) {
  const s = await loadState(), u = s.users[userId];
  const entry = u.planet.photos.find(p => p.id === photoId);
  u.planet.photos = u.planet.photos.filter(p => p.id !== photoId);
  persist();
  if (entry && entry.stored) {
    await idb("readwrite", st => st.delete(photoId)).catch(() => {});
    const urls = urlCache.get(photoId);
    if (urls) { URL.revokeObjectURL(urls.file); URL.revokeObjectURL(urls.thumb); urlCache.delete(photoId); }
  }
}

// start the demo over: forget every change and uploaded photo
export async function resetDemo() {
  try { localStorage.removeItem(STATE_KEY); } catch (e) {}
  await idb("readwrite", st => st.clear()).catch(() => {});
  state = null;
}

// ---------- helpers ----------
function shrink(bitmap, scale, quality) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(bitmap.width * scale));
  c.height = Math.max(1, Math.round(bitmap.height * scale));
  const g = c.getContext("2d");
  g.imageSmoothingQuality = "high";
  g.drawImage(bitmap, 0, 0, c.width, c.height);
  return new Promise(res => c.toBlob(res, "image/jpeg", quality));
}

const urlCache = new Map();         // photo id -> { file, thumb } object URLs, made once per visit
async function resolvePhoto(p) {
  if (!p.stored) return { id: p.id, file: p.src, thumb: p.src, caption: p.caption || "" };
  if (!urlCache.has(p.id)) {
    const rec = await idb("readonly", st => st.get(p.id)).catch(() => null);
    if (!rec) return null;          // its file was lost (e.g. site data cleared)
    urlCache.set(p.id, { file: URL.createObjectURL(rec.full), thumb: URL.createObjectURL(rec.thumb) });
  }
  return { id: p.id, ...urlCache.get(p.id), caption: p.caption || "" };
}

let dbPromise = null;
function idb(mode, fn) {
  if (!dbPromise) dbPromise = new Promise((res, rej) => {
    const req = indexedDB.open("worlds-demo", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("photos", { keyPath: "id" });
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  return dbPromise.then(db => new Promise((res, rej) => {
    const tx = db.transaction("photos", mode);
    const req = fn(tx.objectStore("photos"));
    tx.oncomplete = () => res(req.result);
    tx.onerror = () => rej(tx.error);
  }));
}
