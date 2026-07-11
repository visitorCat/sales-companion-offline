import { db, uid, hashPin, type Rep, type Product, type Customer, type Order, type OrderItem, type Visit, type Note, type Promotion, type Objective, type ScheduledVisit, type Delivery, type CustomerProductPref, type Sector, type Area, type ProductCategory } from "./db-dexie";

const SECTORS = [
  { code: "S2", name: "Sector 2 — Centre", areas: ["Centre Ville","Barga","Gsar","Trik Fildj","Gare 1","Gare 2","Trik Lahmar","Jnayan","Merdeniger"] },
  { code: "S3", name: "Sector 3 — East", areas: ["Wakda","Sabân","Triangle","Karti 8","Lhdeb","Trik Al Amir","Saadli","Nemro","Ba Zayed","Ali Echrif","Cité Hamdane","150","Signa","Zaouia","Radar","Trik Souk"] },
];

const CEVITAL: { name: string; price: number; pkg: number }[] = [
  { name: "CV CHOCOLAT 500G", price: 370, pkg: 12 },{ name: "CV CONFITURE ABRICOT 4/4 800G", price: 240, pkg: 12 },
  { name: "CV CONFITURE ABRICOT 400G", price: 148, pkg: 24 },{ name: "CV CONFITURE FRAISE 1/2 400G", price: 148, pkg: 24 },
  { name: "CV E.F ORANGE 1L PET", price: 98, pkg: 6 },{ name: "CV E.F ORANGE 2L PET", price: 165, pkg: 6 },
  { name: "CV E.F ORANGE 33CL", price: 520, pkg: 1 },{ name: "CV EAU MINERALE 0.5L", price: 240, pkg: 1 },
  { name: "CV EAU MINERALE 1.5L", price: 240, pkg: 1 },{ name: "CV EAU MINERALE GAZEIFE 1L", price: 260, pkg: 1 },
  { name: "CV HARISSA 150G VERRE", price: 110, pkg: 24 },{ name: "CV HUILE ELIO 1L*12", price: 122, pkg: 12 },
  { name: "CV HUILE ELIO 5L", price: 610, pkg: 1 },{ name: "CV HUILE ELIO RONDE 2L", price: 242, pkg: 6 },
  { name: "CV HUILE FLEURIAL PLUS BOXEE 4L", price: 1400, pkg: 1 },{ name: "CV KETCHUP 220G PET", price: 125, pkg: 24 },
  { name: "CV KETCHUP 435G PET", price: 200, pkg: 12 },{ name: "CV MARGARINE FLE BARQUE 250G", price: 110, pkg: 24 },
  { name: "CV MARGARINE FLE BARQUE 500G", price: 190, pkg: 16 },{ name: "CV MARGARINE PARISIEN 500G", price: 160, pkg: 20 },
  { name: "CV MAYONNAISE FUL 200G PET", price: 145, pkg: 24 },{ name: "CV MAYONNAISE FUL FAT 220G VER", price: 150, pkg: 12 },
  { name: "CV MAYONNAISE FUL FAT 395G PET", price: 250, pkg: 12 },{ name: "CV MAYONNAISE FUL FAT 450G VER", price: 270, pkg: 12 },
  { name: "CV MAYONNAISE FUL FAT 680G VER", price: 380, pkg: 6 },{ name: "CV MIEL INDUSTRIEL 1KG ASSILA", price: 190, pkg: 12 },
  { name: "CV MIEL INDUSTRIEL 2KG ASSILA", price: 340, pkg: 6 },{ name: "CV MIEL INDUSTRIEL 3KG ASSILA", price: 500, pkg: 1 },
  { name: "CV MIEL INDUSTRIEL 500G ASSILA", price: 100, pkg: 24 },{ name: "CV MIEL INDUSTRIEL 5KG ASSILA", price: 800, pkg: 1 },
  { name: "CV MOUTARD DIJON 150G", price: 110, pkg: 24 },{ name: "CV MOUTARD FINE DE DIJON 350G", price: 150, pkg: 12 },
  { name: "CV SAUCE ELIO (VERRE) 485G", price: 200, pkg: 12 },{ name: "CV SAUCE HARISSA FOODY'S 850G", price: 245, pkg: 6 },
  { name: "CV SAUCE MAYON FOODY'S 220G PET", price: 85, pkg: 24 },{ name: "CV SAUCE MAYONAISE 850G", price: 230, pkg: 6 },
  { name: "CV SAUCE MAYONAISE FOODY 3KG", price: 570, pkg: 1 },{ name: "CV SAUCE VINIGRETTE CIBOULETTE ET PERSIL 500ML PET", price: 200, pkg: 6 },
  { name: "CV SMAN ELMADINA 1.8KG", price: 780, pkg: 4 },{ name: "CV SMAN ELMADINA 250G*24", price: 120, pkg: 24 },
  { name: "CV SMAN ELMADINA 900G", price: 410, pkg: 8 },{ name: "CV SMEN SPECIAL GATEAUX 900G", price: 410, pkg: 8 },
  { name: "CV SUCRE GLACE SKOR 700G", price: 125, pkg: 10 },{ name: "CV SUCRE SKOR 1KG", price: 880, pkg: 1 },
  { name: "CV SUCRE SKOR 2KG", price: 700, pkg: 1 },{ name: "CV SUCRE SKOR 5KG", price: 440, pkg: 1 },
  { name: "CV SUCRE SKOR MORCEAU 750G", price: 1300, pkg: 1 },{ name: "CV SUCRE SKOR ROUX 1KG", price: 155, pkg: 10 },
];

function categorize(n: string): string { const l = n.toLowerCase(); if (l.includes("chocolat")) return "Chocolate"; if (l.includes("confiture")) return "Jam"; if (l.includes("orange")||l.includes("eau")) return "Water"; if (l.includes("harissa")&&!l.includes("sauce")) return "Harissa"; if (l.includes("huile")) return "Oil"; if (l.includes("ketchup")) return "Ketchup"; if (l.includes("margarine")) return "Margarine"; if (l.includes("mayonnaise")&&!l.includes("sauce")) return "Mayonnaise"; if (l.includes("miel")) return "Honey"; if (l.includes("moutard")) return "Others"; if (l.includes("sauce")) return "Others"; if (l.includes("sman")||l.includes("smen")) return "Smen"; if (l.includes("sucre")) return "Sugar"; return "Others"; }

export async function seedDatabase(): Promise<void> {
  // Only seed if NO rep exists yet (first run). Never seed products — users create/import their own.
  if (await db.reps.count() > 0) return;
  const repId = uid("rep_");
  await db.reps.add({ id: repId, name: "Karim Benali", email: "rep@field.app", password: "1234", phone: "+213661234567", pinHash: await hashPin("1234"), monthlyTargetCartons: 100, createdAt: new Date().toISOString() });
  await db.objectives.add({ id: uid("obj_"), repId, month: new Date().toISOString().slice(0,7), targetCartons: 100 });
  for (let si = 0; si < SECTORS.length; si++) { const s = SECTORS[si]; const sid = uid("sec_"); await db.sectors.add({ id: sid, code: s.code, name: s.name, order: si }); for (let ai = 0; ai < s.areas.length; ai++) await db.areas.add({ id: uid("area_"), sectorId: sid, name: s.areas[ai], order: ai }); }
  const cats = ["Chocolate","Jam","Water","Harissa","Oil","Ketchup","Margarine","Mayonnaise","Honey","Smen","Sugar","Others"]; const cm: Record<string,string> = {};
  for (let i = 0; i < cats.length; i++) { const cid = uid("cat_"); cm[cats[i]] = cid; await db.categories.add({ id: cid, name: cats[i], order: i }); }
  // No demo products — users create or import their own
  const sectors = await db.sectors.toArray(); const areas = await db.areas.toArray();
  const fn = ["Ahmed","Mohamed","Yacine","Bilal","Sofiane","Riad","Nabil","Toufik","Samir","Karim","Hicham","Rachid","Djamel","Amine","Faouzi"]; const ss = ["Épicerie","Mini Marché","Market","Dépôt","Supérette","Alimentation","Magasin","Comptoir"]; const ts = ["GROCERY","MINI_MARKET","SUPERMARKET","WHOLESALE","RESTAURANT","CAFE","OTHER"]; const rt: ("A"|"B"|"C")[] = ["A","B","C"];
  let idx = 0; const bL = 36.9, bLng = 7.77;
  for (const s of sectors) for (const area of areas.filter(a => a.sectorId === s.id)) for (let k = 0; k < 1+(idx%2); k++) { const nm = fn[(idx+k)%fn.length]; await db.customers.add({ id: uid("cust_"), shopName: `${nm} ${ss[(idx+k)%ss.length]}`, owner: nm, phone: `0${600+(idx%400)}${String(100000+idx*137).slice(0,6)}`, type: ts[idx%ts.length], sectorId: s.id, areaId: area.id, repId, rating: rt[idx%3], lat: bL+(Math.random()-0.5)*0.08, lng: bLng+(Math.random()-0.5)*0.08, address: `${area.name}, ${s.code}`, lastVisitAt: null, lastOrderAt: null, visitOrder: idx, active: true }); idx++; }
}
