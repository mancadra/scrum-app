# Scrum App – Demo Walkthrough

> **Predpogoj:** Zaženi `db/clear_everything_in_db.sql`, nato `db/seed_demo_data.sql` v Supabase SQL editorju.
>
> **Geslo za vse uporabnike:** `testpassword123!`

---

## Accounts at a glance

| Uporabnik | Username | Vloga v sistemu | Vloga na projektu |
|---|---|---|---|
| Admin Admin | `admin` | Administrator | / |
| Manca Drašček | `manca.drascek` | User | Scrum Master |
| Marko Poženel | `marko.pozenel` | User | Product Owner |
| Grega Radež | `grega.radez` | User | Developer |
| Vito Verdnik | `vito.verdnik` | User | Developer |
| Anže Judež | `anze.judez` | User | Developer |
| Random Random | `random` | User | (ni na projektu) |

---

## #30 – Prijava v sistem

### ✅ Veljavna prijava
1. Odpri aplikacijo.
2. Vnesi:
   - **Username:** `admin`
   - **Password:** `testpassword123!`
3. Klikni **Prijava**.
4. **Pričakovano:** Uspešna prijava, viden pozdrav in podatki o zadnji prijavi.

### ❌ Napačno geslo
1. **Username:** `admin`
2. **Password:** `wrongpassword`
3. **Pričakovano:** Sporočilo o napaki – prijava zavrnjena.

### ❌ Napačno uporabniško ime
1. **Username:** `neobstaja`
2. **Password:** `testpassword123!`
3. **Pričakovano:** Sporočilo o napaki – prijava zavrnjena.

### ✅ Preveri razkritje gesla & blokada kopiranja
- Zadnja črka se za sekundo prikaže
- Klikni ikono za **razkritje gesla** (oko) – geslo se prikaže.
- Preveri, da **copy-paste ni mogoč** na polju za geslo.

### ✅ Preveri ponastavitev gesla
- Možnost ponastavitve gesla
- Vpis starega gesla in dvojni vpis novega gesla
- staro geslo mora biti pravilno
- nova gesla se morata ujemati
- login upošteva novo geslo

---

## #1 – Dodajanje uporabnikov

> **Prijavljen kot:** `admin`
> **Navigacija:** Admin panel → Upravljanje uporabnikov → Dodaj uporabnika

### ❌ Podvojeno uporabniško ime
Vnesi:
- **Username:** `admin` ← že obstaja
- **Name:** `Test`
- **Surname:** `Test`
- **Email:** `test2@scrumapp.si`
- **Password:** `testpassword123!`
- **Role:** `User`

**Pričakovano:** Napaka – uporabniško ime že obstaja.

### ❌ Obvezna polja – prazno uporabniško ime
- Pusti **Username** prazno, ostalo izpolni.

**Pričakovano:** Obrazec ne odda, polje označeno kot obvezno.

### ❌ Prekratko geslo
- **Username:** `kratko.geslo`
- **Password:** `abc` ← manj kot 12 znakov

**Pričakovano:** Napaka – geslo mora biti vsaj 12 znakov.

### ✅ Regularen potek – dodaj novega uporabnika
Vnesi:
- **Username:** `jan.novak`
- **Name:** `Jan`
- **Surname:** `Novak`
- **Email:** `jan@scrumapp.si`
- **Password:** `testpassword123!`
- **Role:** `User`

**Pričakovano:** Uporabnik uspešno ustvarjen, viden na seznamu.


### ✅ Preveri sistemske pravice
- Ustvari uporabnika z **Role:** `Administrator`.
- Prijavi se s tem računom.
- **Pričakovano:** Dostop do admin panela.

### ✅ Preveri skritje ostalim uporabnikom
> **Prijavljen kot:** `manca.drascek`
> **Pričakovano:** Gumb za dodajanje uporabnika ni na voljo.

---

## #4 – Dodajanje projekta

> **Prijavljen kot:** `admin`
> **Navigacija:** Projekti → Nov projekt

### ✅ Regularen potek
Vnesi:
- **Name:** `Spletna trgovina`
- **Description:** `E-commerce platforma za prodajo oblačil.`
- Dodaj člane: `manca.drascek` (Scrum Master), `marko.pozenel` (Product Owner), `grega.radez` (Developer)

**Pričakovano:** Projekt ustvarjen, viden na seznamu.

### ❌ Podvojeno ime projekta
- **Name:** `E-učilnica` ← že obstaja
- **Pričakovano:** Napaka – projekt s tem imenom že obstaja.

### ✅ Preveri projektne vloge
- Odpri projekt `Spletna trgovina`.
- Preveri, da so vloge pravilno prikazane.

### ✅ Preveri skritje ostalim uporabnikom
> **Prijavljen kot:** `manca.drascek`
> **Pričakovano:** Gumb za dodajanje projekta ni na voljo.

---

## #6 – Ustvarjanje novega Sprinta

> **Prijavljen kot:** `manca.drascek`
> **Navigacija:** Projekt E-učilnica → Sprinti → Nov sprint

### ❌ Končni datum pred začetnim
- **Start date:** `2026-06-10`
- **End date:** `2026-06-01`
- **Starting speed:** `25`
- **Pričakovano:** Napaka – končni datum mora biti po začetnem.

### ❌ Začetni datum v preteklosti
- **Start date:** `2025-01-01`
- **End date:** `2025-01-31`
- **Starting speed:** `25`
- **Pričakovano:** Napaka – začetni datum mora biti v prihodnosti.

### ❌ Neregularna hitrost
- **Start date:** `2026-06-02`
- **End date:** `2026-06-30`
- **Starting speed:** `-5` (ali `0` ali `abc`)
- **Pričakovano:** Napaka – hitrost mora biti pozitivno število.

### ❌ Prekrivanje z obstoječim sprintom
- **Start date:** `2026-03-15` ← znotraj Sprint 2 (1.3–31.3)
- **End date:** `2026-04-15`
- **Starting speed:** `25`
- **Pričakovano:** Napaka – sprint se prekriva z obstoječim.

### ✅ Regularen potek
Vnesi:
- **Start date:** `2026-05-04`
- **End date:** `2026-05-29`
- **Starting speed:** `25`

**Pričakovano:** Sprint uspešno ustvarjen.

---

## #8 – Dodajanje uporabniških zgodb

> **Prijavljen kot:** `marko.pozenel` (ali `manca.drascek`)
> **Navigacija:** Projekt E-učilnica → Product Backlog → Dodaj zgodbo

### ❌ Podvojeno ime
- **Name:** `Prijava v sistem` ← že obstaja
- **Pričakovano:** Napaka – zgodba s tem imenom že obstaja.

### ❌ Neregularna poslovna vrednost
- **Name:** `Testna zgodba`
- **Business value:** `-10` (ali `abc`)
- **Pričakovano:** Napaka – poslovna vrednost mora biti pozitivno celo število.

### ✅ Regularen potek
Vnesi:
- **Name:** `Izvoz poročil`
- **Description:** `Učitelj lahko izvozi poročilo o oddajah nalog v PDF formatu.`
- **Acceptance tests:** `Poročilo se izvozi in vsebuje vse oddaje.`
- **Priority:** `Could have`
- **Business value:** `35`

**Pričakovano:** Zgodba dodana na Product Backlog.

### ✅ Ustrezna prioriteta
- Preveri, da so na voljo vse prioritete: `Must have`, `Should have`, `Could have`, `Won't have this time`.
- **Pričakovano:** Vse prioritete se pravilno shranijo.

---

## #11 – Ocena časovne zahtevnosti

> **Prijavljen kot:** `manca.drascek`
> **Navigacija:** Projekt E-učilnica → Product Backlog

### ❌ Neveljavna ocena
- Na zgodbi `Integracija z Google Calendar` (Story 7 – brez ocene) vnesi **Time complexity:** `-3` (ali `abc`)
- **Pričakovano:** Napaka – ocena mora biti pozitivno število.

### ❌ Zgodba, ki je že dodeljena sprintu
- Poskusi spremeniti oceno zgodbi `Upravljanje tečajev` (Story 3 – v aktivnem sprintu).
- **Pričakovano:** Napaka ali polje onemogočeno.

### ✅ Regularen potek
- Izberi zgodbo `Integracija z Google Calendar` (Story 7 – brez ocene).
- Nastavi **Time complexity:** `8`
- **Pričakovano:** Ocena shranjena.

---

## #13 – Dodajanje zgodb v Sprint

> **Prijavljen kot:** `manca.drascek`
> **Navigacija:** Projekt E-učilnica → Sprinti → Sprint 3 → Dodaj zgodbe

### ❌ Zgodba brez ocene zahtevnosti
- Poskusi dodati `Mobilna aplikacija` (Story 8 – nima time complexity).
- **Pričakovano:** Napaka – zgodba nima ocene zahtevnosti.

### ❌ Že realizirana zgodba
- Poskusi dodati `Prijava v sistem` (Story 1 – realized=true).
- **Pričakovano:** Zgodba ni na voljo za dodelitev.

### ❌ Zgodba, ki je že v aktivnem sprintu
- Poskusi dodati `Upravljanje tečajev` (Story 3 – že v Sprint 2).
- **Pričakovano:** Napaka ali zgodba ni na voljo.

### ✅ Regularen potek
- Dodaj `Sistem obveščanja` (Story 6 – time complexity=5, nerealizirana, nedodeljena) v Sprint 3.
- **Pričakovano:** Zgodba dodana v sprint.

---

## #14 – Dodajanje nalog

> **Prijavljen kot:** `manca.drascek`
> **Navigacija:** Projekt E-učilnica → Sprint Backlog → Upravljanje tečajev (Story 3) → Dodaj nalogo

### ❌ Zgodba izven aktivnega sprinta
- Poskusi dodati nalogo k `Sistem obveščanja` (Story 6 – ni v aktivnem sprintu).
- **Pričakovano:** Napaka – naloge je mogoče dodajati le k zgodbam v aktivnem sprintu.

### ❌ Že realizirana zgodba
- Poskusi dodati nalogo k `Prijava v sistem` (Story 1 – realized=true).
- **Pričakovano:** Napaka ali možnost onemogočena.

### ❌ Neregularna ocena časa
- **Description:** `Testna naloga`
- **Time estimate:** `-2` (ali `abc`)
- **Pričakovano:** Napaka – ocena mora biti pozitivno število.

### ✅ Regularen potek
Vnesi:
- **Description:** `Napiši unit teste za REST API`
- **Time estimate:** `2`
- **Proposed developer:** `anze.judez`

**Pričakovano:** Naloga dodana, prikazana kot nedodeljena.

### ✅ Preveri skritje gumba za dodajanje
> **Prijavljen kot:** `marko.pozenel`
> **Pričakovano:** Gumb za dodajanje naloge ni na voljo (Product Owner ni developer/scrum master).

---

## #16 – Sprejemanje nalog

> **Prijavljen kot:** `grega.radez`
> **Navigacija:** Projekt E-učilnica → Sprint Backlog

### ❌ Naloga, ki jo je že sprejel drug razvijalec
- Poskusi sprejeti Task 3 (`Razvij modul za oddajo` – sprejel Vito).
- **Pričakovano:** Napaka – naloga je že dodeljena.

### ✅ Regularen potek – nedodeljena naloga
- Sprejmi Task 1 (`Pripravi REST API` – nedodeljena, brez predlaganega razvijalca).
- **Pričakovano:** Naloga se označi kot dodeljena Gregi.

### ✅ Naloga, ki ti je bila predlagana
- Task 5 (`Implementiraj forum`) je bil predlagan Gregi (`FK_proposedDeveloper`).
- Sprejmi jo.
- **Pričakovano:** Naloga dodeljena Gregi.

---

## #20 – Zaključevanje nalog

> **Prijavljen kot:** `anze.judez`
> **Navigacija:** Projekt E-učilnica → Sprint Backlog

### ❌ Že zaključena naloga
- Preveri Task 4 (`Zasnuj podatkovno bazo` – seeded kot `finished=true`).
- **Pričakovano:** Gumb za zaključitev ni na voljo ali je napaka.

### ❌ Nedodeljena naloga
- Poskusi zaključiti Task 1 (nedodeljena – Anže je ni sprejel).
- **Pričakovano:** Napaka – naloge, ki ni sprejeta, ni mogoče zaključiti.

### ✅ Regularen potek
- Prijavi se kot `grega.radez`.
- Zaključi Task 1 (ki ga je Grega sprejel v #16).
- **Pričakovano:** Naloga se prestavi v kategorijo **Zaključene**.

---

## #25 – Potrjevanje zgodb

> **Prijavljen kot:** `marko.pozenel`
> **Navigacija:** Projekt E-učilnica → Product Backlog

### ❌ Že potrjena zgodba
- Poskusi znova potrditi Story 1 (`Prijava v sistem` – accepted=true, seeded).
- **Pričakovano:** Napaka ali gumb onemogočen.

### ❌ Zgodba izven tekočega Sprinta
- Poskusi potrditi Story 6 (`Sistem obveščanja` – nedodeljena, ni v sprintu).
- **Pričakovano:** Napaka – ni v aktivnem sprintu.

### ❌ Zgodba, ki je bila zavrnjena
- Poskusi potrditi Story 5 (`Forum za razpravo` – če jo je Marko zavrnil v #26 Demo).
- **Pričakovano:** Napaka ali gumb onemogočen.

### ✅ Regularen potek
- Potrdi Story 3 (`Upravljanje tečajev` – v aktivnem sprintu, naloge zaključene).
- **Pričakovano:** Zgodba označena kot realizirana, premakne se v kategorijo Realizirane.

---

## #26 – Zavračanje zgodb

> **Prijavljen kot:** `marko.pozenel`
> **Navigacija:** Projekt E-učilnica → Sprint Backlog

### ❌ Zgodba izven tekočega Sprinta
- Poskusi zavrniti Story 6 (`Sistem obveščanja` – ni v sprintu).
- **Pričakovano:** Napaka.

### ❌ Že potrjena zgodba
- Poskusi zavrniti Story 3, če si jo že potrdil v #25.
- **Pričakovano:** Napaka ali gumb onemogočen.

### ✅ Regularen potek
- Zavrni Story 5 (`Forum za razpravo` – v aktivnem sprintu).
- Dodaj komentar: `Forum je nepopoln, manjkajo moderatorske funkcije.`
- **Pričakovano:** Zgodba se vrne v Product Backlog kot nerealizirana, komentar viden pri zgodbi.

---

## #27 – Seznam zahtev (Product Backlog)

> **Prijavljen kot:** `manca.drascek`
> **Navigacija:** Projekt E-učilnica → Product Backlog

### ✅ Preveri vse tri kategorije
Seeded podatki pokrivajo:

| Kategorija | Zgodbe |
|---|---|
| **Realizirane** | Story 1 (Prijava v sistem), Story 2 (Registracija uporabnika) |
| **Dodeljene aktivnemu Sprintu** | Story 3 (Upravljanje tečajev), Story 4 (Oddaja nalog), Story 5 (Forum) |
| **Nedodeljene** | Story 6 (Sistem obveščanja), Story 7 (Google Calendar), Story 8 (Mobilna app) |

**Pričakovano:** Vse tri kategorije so jasno prikazane in ločene.

---

## #28 – Seznam nalog (Sprint Backlog)

> **Prijavljen kot:** `manca.drascek`
> **Navigacija:** Projekt E-učilnica → Sprint Backlog

### ✅ Preveri vse štiri kategorije
Seeded podatki pokrivajo:

| Kategorija | Naloge |
|---|---|
| **Nedodeljene** | Task 1 (REST API), Task 5 (Forum – predlagan Grega, ne sprejet) |
| **Dodeljene** | Task 2 (Frontend – sprejel Grega) |
| **Aktivne** | Task 3 (Modul za oddajo – Vito dela, odprta vrstica v TimeTables) |
| **Zaključene** | Task 4 (Podatkovna baza – Anže, finished=true) |

**Pričakovano:** Vse štiri kategorije so jasno prikazane.
