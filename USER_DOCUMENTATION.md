# Uporabniška dokumentacija – Scrum aplikacija

## Kazalo
1. [Vloge v sistemu](#1-vloge-v-sistemu)
2. [Prijava v sistem](#2-prijava-v-sistem)
3. [Sprememba gesla](#3-sprememba-gesla)
4. [Upravljanje uporabnikov (Administrator)](#4-upravljanje-uporabnikov-administrator)
5. [Upravljanje projektov (Administrator)](#5-upravljanje-projektov-administrator)
6. [Krmarjenje po projektu](#6-krmarjenje-po-projektu)
7. [Seznam zahtev – Product Backlog](#7-seznam-zahtev--product-backlog)
8. [Sprinti](#8-sprinti)
9. [Sprint Board – seznam nalog](#9-sprint-board--seznam-nalog)

---

## 1. Vloge v sistemu

### Sistemske vloge
| Vloga | Opis |
|---|---|
| **Administrator sistema** | Upravlja z uporabniki in projekti. Dostop do Admin panela. |
| **Uporabnik sistema** | Sodeluje na projektih v eni od projektnih vlog. |

### Projektne vloge
| Vloga | Opis |
|---|---|
| **Produktni vodja** (Product Owner) | Dodaja in upravlja uporabniške zgodbe, potrjuje ali zavrača zgodbe ob koncu sprinta. |
| **Skrbnik metodologije** (Scrum Master) | Ustvarja sprinte, dodaja zgodbe v sprint, določa časovne zahtevnosti, dodaja naloge. |
| **Član razvojne skupine** (Developer) | Sprejema in zaključuje naloge, dodaja naloge. |

---

## 2. Prijava v sistem

1. Odprite aplikacijo v brskalniku.
2. Vnesite **uporabniško ime** in **geslo**.
3. Kliknite **Login**.

### Opombe
- Geslo mora ustrezatizahtevam za geslo (navedeno spodaj).
- Za razkritje gesla kliknite ikono 👁 ob polju za geslo.
- Med vnašanjem gesla se zadnji vnešeni znak za 1 sekundo razkrije.
- Kopiranje gesla iz polja ni dovoljeno.
- Po uspešni prijavi je v zgornjem desnem kotu prikazan čas zadnje prijave.

---

## 3. Sprememba gesla

1. Na strani za prijavo kliknite **Change Password** (pod gumbom Login).
2. Vnesite **uporabniško ime**, **staro geslo**, **novo geslo** in **potrditev novega gesla**.
3. Kliknite **Change Password**.
4. Po uspešni spremembi se prikaže potrditveno sporočilo. Prijavite se z novim geslom.

### Zahteve za geslo
- Vsaj **12 znakov**, največ **128 znakov**.
- Geslo ne sme vsebovati dveh zaporednih presledkov.
- Geslo ne sme biti med 100 najpogostejšimi gesli.

---

## 4. Upravljanje uporabnikov (Administrator)

Dostop: **Admin Panel** v navigacijski vrstici (vidno samo administratorjem).

### Dodajanje novega uporabnika
1. Izpolnite obrazec: **ime**, **priimek**, **uporabniško ime**, **e-pošta**, **geslo** in **sistemska vloga**.
2. Kliknite **Dodaj uporabnika**.
3. Novoustvarjeni uporabnik se pojavi v seznamu spodaj.

### Pravila
- Uporabniško ime mora biti **edinstveno**.
- Geslo mora ustrezati zahtevam (vsaj 12 znakov itd.).
- Sistemska vloga je bodisi **Administrator sistema** ali **Uporabnik sistema**.

---

## 5. Upravljanje projektov (Administrator)

Dostop: **+ New Project** v navigacijski vrstici (vidno samo administratorjem).

### Ustvarjanje novega projekta
1. Vnesite **ime projekta** in **opis**.
2. Dodajte člane ekipe: iz spustnega menija izberite uporabnika, določite mu projektno vlogo in kliknite **+ Add**.
3. Vsak projekt mora imeti:
   - natanko **enega Produktnega vodjo**,
   - natanko **enega Skrbnika metodologije**,
   - vsaj **enega Člana razvojne skupine**.
4. Kliknite **Ustvari projekt**.

---

## 6. Krmarjenje po projektu

- V navigacijski vrstici so prikazani vsi projekti, do katerih imate dostop.
- Klik na ime projekta vas postavi na ta projekt.
- Izbrani projekt je označen z modro barvo.

---

## 7. Seznam zahtev – Product Backlog

Dostop: Kliknite **Backlog** na strani projekta.

### Pregled zgodb
Zgodbe so razdeljene v tri razdelke:
- **Nedodeljene** – zgodbe, ki nisp dodeljene aktivnemu oz. prihodnjemu sprintu.
- **Dodeljene** – zgodbe, ki so del aktivnega ali prihodnjega sprinta.
- **Realizirane** – zgodbe, ki jih je potrdil produktni vodja.

### Dodajanje uporabniške zgodbe *(Produktni vodja, Skrbnik metodologije)*
1. Kliknite **+ Dodaj zgodbo**.
2. Izpolnite: **ime**, **besedilo**, **sprejemne teste**, **prioriteto** in **poslovno vrednost**.
3. Kliknite **Shrani**.

Prioritete: `Must have`, `Should have`, `Could have`, `Won't have this time`.

### Določanje časovne zahtevnosti *(Skrbnik metodologije)*
1. Pri nedodeljeni zgodbi kliknite ikono ure / gumb za oceno.
2. Vnesite oceno v **točkah**.
3. Kliknite **Potrdi**.

> Zgodbam, ki so že dodeljene sprintu, časovne zahtevnosti ni mogoče spremeniti.

---

## 8. Sprinti

Dostop: Zavihek **Sprinti** na strani projekta.

### Ustvarjanje sprinta *(Skrbnik metodologije)*
1. Kliknite **+ Dodaj Sprint**.
2. Določite **ime**, **začetni datum**, **končni datum** in **pričakovano hitrost**.
3. Kliknite **Shrani**.

#### Pravila
- Začetni datum ne sme biti v preteklosti.
- Končni datum mora biti po začetnem.
- Hitrost mora biti pozitivno število.
- Sprinti se ne smejo časovno prekrivati.

### Ogled sprinta
- Kliknite na sprint v seznamu, da odprete njegov Sprint Board.
- Sprintov ni mogoče odpreti, če so bili že izvedeni.

---

## 9. Sprint Board – seznam nalog

Dostop: Kliknite na sprint v seznamu sprintov.

Sprint Board prikazuje Kanban tablo s tremi stolpci:

| Stolpec | Vsebina |
|---|---|
| **Sprint Backlog** | Nedodeljene naloge |
| **Working On** | Dodeljene in aktivne naloge |
| **Finished** | Zaključene naloge |

### Dodajanje naloge *(Skrbnik metodologije, Razvijalec)*
1. Kliknite **+ Nova naloga**.
2. Izberite **uporabniško zgodbo**, vpišite **opis** in **oceno časa** (v urah).
3. Po želji izberite **razvijalca**, ki mu je naloga predlagana.
4. Kliknite **Ustvari nalogo**.

> Naloge je mogoče dodajati samo k zgodbam, ki so del aktivnega ali prihodnjega sprinta.

### Sprejemanje naloge *(Razvijalec)*
- V stolpcu **Sprint Backlog** kliknite **Sprejmi nalogo** na nalogi, ki jo želite prevzeti.
- Naloga se prestavi v stolpec **Working On** in se označi kot dodeljena.
- Ko je naloga enkrat sprejeta, je drugi razvijalci ne morejo več sprejeti.
- Produktni vodje in Skrbniki metodologije nalog ne morejo sprejemati.

> Če je bila naloga predlagana drugemu razvijalcu, bo prikazano sporočilo *"Predlagano drugemu razvijalcu"*.

### Zaključevanje naloge *(Razvijalec, ki je nalogo sprejel)*
- V stolpcu **Working On** kliknite **Zaključi nalogo**.
- Naloga se prestavi v stolpec **Finished**.

---

## Pogosta vprašanja

**Zakaj ne vidim gumba "Sprejmi nalogo"?**
Naloge lahko sprejemajo samo **člani razvojne skupine** (Developerji). Če ste Skrbnik metodologije ali Produktni vodja, boste videli opozorilo, ne gumba.

**Zakaj ne morem spremeniti časovne zahtevnosti zgodbe?**
Zgodba je že dodeljena sprintu. Časovne zahtevnosti dodeljenih zgodb ni mogoče urejati.

**Zakaj ne morem ustvariti sprinta?**
Samo **Skrbnik metodologije** lahko ustvarja sprinte. Preverite svojo projektno vlogo.

**Zakaj se pri ustvarjanju projekta pojavi napaka?**
Preverite, da ima projekt vsaj enega člana vsake od treh projektnih vlog in da ime projekta še ni v uporabi.
