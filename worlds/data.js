// ============================================================
//  WORLDS DATA: the only place the game gets users and planets from.
//
//  In this demo everything is read from the JSON files in worlds/users/
//  (one file per person, listed in worlds/users/index.json).
//  Later this file gets swapped for calls to a real server
//  (Cloudflare Worker + database), and the game code doesn't change.
// ============================================================

const USERS_DIR = new URL("users/", import.meta.url);
const cache = new Map();

async function readJson(name) {
  if (!cache.has(name)) {
    cache.set(name, fetch(new URL(name, USERS_DIR)).then(r => {
      if (!r.ok) throw new Error("Couldn't load worlds/users/" + name + " (" + r.status + ")");
      return r.json();
    }));
  }
  return cache.get(name);
}

// everyone in the demo: [{ id, name }]
export async function listUsers() {
  const ids = await readJson("index.json");
  const all = await Promise.all(ids.map(getUser));
  return all.filter(Boolean).map(u => ({ id: u.id, name: u.name }));
}

// one person's profile: { id, name, avatar, friends }, or null if there's no such person
export async function getUser(userId) {
  const ids = await readJson("index.json");
  if (!ids.includes(userId)) return null;
  const { planet, ...profile } = await readJson(userId + ".json");
  return profile;
}

// the saved description of someone's planet (name, theme, colours, trail, decorations, photos)
export async function getPlanet(userId) {
  const ids = await readJson("index.json");
  if (!ids.includes(userId)) return null;
  return (await readJson(userId + ".json")).planet;
}

// the people this person is friends with (their profiles), skipping any that don't exist
export async function getFriends(userId) {
  const user = await getUser(userId);
  if (!user) return [];
  const list = await Promise.all((user.friends || []).map(getUser));
  return list.filter(Boolean);
}

// Coming with the next demo features (customizing and adding photos):
//   savePlanet(planet), addPhoto(userId, file)
