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
10. [Urejanje lastnega profila](#10-urejanje-lastnega-profila)
11. [Vzdrževanje projekta (Skrbnik metodologije / Administrator)](#11-vzdrževanje-projekta-skrbnik-metodologije--administrator)
12. [Dodajanje zgodb v Sprint](#12-dodajanje-zgodb-v-sprint)
13. [Vzdrževanje nalog](#13-vzdrževanje-nalog)
14. [Odpovedovanje nalogam](#14-odpovedovanje-nalogam)
15. [Beleženje porabe časa](#15-beleženje-porabe-časa)
16. [Dnevnik dela (Timesheet)](#16-dnevnik-dela-timesheet)
17. [Potrjevanje in zavračanje zgodb](#17-potrjevanje-in-zavračanje-zgodb)
18. [Projektni zid](#18-projektni-zid)
19. [Diagram Burn-Down](#19-diagram-burn-down)
20. [Pogosta vprašanja](#pogosta-vprašanja)

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

### Urejanje obstoječega uporabnika
1. V seznamu uporabnikov kliknite gumb **Uredi** pri želenem uporabniku.
2. Obrazec na vrhu strani se izpolni s trenutnimi podatki.
3. Spremenite katerekoli podatke: **ime**, **priimek**, **uporabniško ime**, **e-pošta**, **geslo** ali **sistemsko vlogo**.
4. Novo geslo vpišite samo, če ga želite spremeniti – sicer pustite polje prazno.
5. Kliknite **Shrani spremembe**.

> Če spremenite uporabniško ime na že obstoječe, bo sistem vrnil napako.

### Brisanje uporabnika
1. V seznamu kliknite gumb **Izbriši** pri želenem uporabniku.
2. Potrdite brisanje v potrditvenem pogovornem oknu.
3. Uporabnik je trajno odstranjen iz sistema.

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

> Ime projekta mora biti edinstveno – sistem bo vrnil napako, če ime že obstaja.

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

### Urejanje uporabniške zgodbe *(Produktni vodja, Skrbnik metodologije)*
1. Kliknite na zgodbo, da se odpre podrobni pogled.
2. Kliknite **Uredi zgodbo**.
3. Spremenite želena polja in kliknite **Shrani**.

> Mogoče je urejati samo zgodbe, ki **niso dodeljene nobenemu sprintu** in **niso realizirane**.  
> Če spremenite ime na že obstoječe, bo sistem vrnil napako.

### Brisanje uporabniške zgodbe *(Produktni vodja, Skrbnik metodologije)*
1. Kliknite na zgodbo, da se odpre podrobni pogled.
2. Kliknite **Izbriši zgodbo** in potrdite v pogovornem oknu.

> Brisati je mogoče samo zgodbe, ki **niso dodeljene nobenemu sprintu** in **niso realizirane**.

### Dodajanje opombe k zgodbi *(Člani razvojne skupine)*
1. Kliknite na zgodbo v Sprint Boardu, da se odpre podrobni pogled.
2. Vpišite opombo v polje za komentar na dnu.
3. Kliknite **Dodaj komentar**.

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

### Urejanje obstoječega sprinta *(Skrbnik metodologije)*
1. V seznamu sprintov kliknite ikono za nastavitve (zobnik) pri sprintu, ki se **še ni pričel**.
2. V modalnem oknu spremenite **začetni datum**, **končni datum** ali **hitrost**.
3. Kliknite **Shrani**.

> Sprintov, ki so že aktivni ali zaključeni, ni mogoče urejati.

### Brisanje sprinta *(Skrbnik metodologije)*
1. V urejevalniku sprinta kliknite **Izbriši sprint**.
2. Potrdite brisanje v potrditvenem oknu.

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

### Urejanje naloge *(Skrbnik metodologije, Razvijalec)*
1. Kliknite na nalogo, da se odpre podrobni pogled.
2. Kliknite **Uredi nalogo**.
3. Spremenite **opis**, **oceno časa** ali **predlaganega razvijalca**.
4. Kliknite **Shrani spremembe**.

### Brisanje naloge *(Skrbnik metodologije, Razvijalec)*
1. Kliknite na nalogo, da se odpre podrobni pogled.
2. Kliknite **Izbriši nalogo** in potrdite v pogovornem oknu.

> Brisanje naloge, ki jo je razvijalec že sprejel, je mogoče, a bo naloga izginila iz razvijalčevega pregleda.

### Beleženje porabe časa *(Razvijalec)*
1. V stolpcu **Working On** kliknite **Začni delo** na svoji nalogi.
2. Zažene se števec časa v glavi aplikacije, ki beleži vaš čas dela.
3. Ko želite prekiniti ali zaključiti, kliknite **Ustavi** v prikazu aktivnega števca.
4. Vloženi čas se avtomatsko zabeleži. Če ste isti dan že delali na tej nalogi, se ure prištejejo.

### Odpovedovanje nalogi *(Razvijalec)*
- V stolpcu **Working On** kliknite **Odpovej nalogo** na svoji nalogi.
- Naloga se vrne v stolpec **Sprint Backlog** in jo lahko sprejme drug razvijalec.

> Odpovedati je mogoče samo nalogo, ki ste jo sami sprejeli.

---

## 10. Urejanje lastnega profila

Dostop: **Profile** v navigacijski vrstici (kliknite ikono uporabnika ali ime).

### Sprememba osebnih podatkov
1. Na zavihku **Profil** spremenite **ime**, **priimek**, **uporabniško ime** ali **e-pošto**.
2. Kliknite **Shrani spremembe**.

> Novo uporabniško ime ne sme biti že v uporabi pri drugem računu.

### Sprememba gesla
1. Na zavihku **Profil** izpolnite polje **Staro geslo**, **Novo geslo** in **Potrditev novega gesla**.
2. Kliknite **Shrani spremembe**.

---

## 11. Vzdrževanje projekta *(Skrbnik metodologije / Administrator)*

Dostop: gumb **Nastavitve projekta** (zobnik) na strani projekta (vidno Skrbniku metodologije in Administratorju).

### Sprememba imena projekta
1. V modalnem oknu nastavitev spremenite **ime projekta**.
2. Kliknite **Shrani ime**.

> Ime mora biti edinstveno. Sistem bo opozoril na podvajanje.

### Dodajanje novega člana
1. Iz spustnega menija izberite **uporabnika**, ki ga želite dodati.
2. Izberite njegovo **projektno vlogo**.
3. Kliknite **+ Dodaj člana**.

### Sprememba vloge obstoječega člana
1. V seznamu članov poiščite želenega člana.
2. Iz spustnega menija poleg njegovega imena izberite novo vlogo.
3. Sprememba se shrani samodejno (ali ob kliku na **Shrani**).

### Odstranitev člana iz projekta
1. V seznamu članov kliknite ikono za odstranitev (koš) pri želenem članu.
2. Potrdite odstranitev.

---

## 12. Dodajanje zgodb v Sprint *(Skrbnik metodologije)*

Dostop: gumb **Upravljaj zgodbe** na strani Sprint Boarda.

1. Kliknite **Upravljaj zgodbe** (prikaže se seznam Backlog zgodb).
2. V prikazanem panelu so navedene vse zgodbe z ocenjeno časovno zahtevnostjo, ki **niso realizirane** in **niso že dodeljene** temu sprintu.
3. Kliknite **+** ali **Dodaj** poleg zgodbe, ki jo želite dodati v sprint.
4. Skupne točke ne smejo preseči **pričakovane hitrosti** sprinta (sistem vas bo opozoril).

> Zgodbe brez ocene časovne zahtevnosti niso prikazane v tem seznamu.  
> Že realiziranih zgodb ni mogoče dodati v sprint.

---

## 13. Vzdrževanje nalog *(Skrbnik metodologije, Razvijalci)*

Glejte razdelek [Sprint Board – seznam nalog](#9-sprint-board--seznam-nalog) za podrobnosti o urejanju in brisanju nalog.

---

## 14. Odpovedovanje nalogam *(Razvijalci)*

Glejte razdelek [Sprint Board – seznam nalog](#9-sprint-board--seznam-nalog) za podrobnosti o odpovedovanju nalogam.

---

## 15. Beleženje porabe časa *(Razvijalci)*

Glejte razdelek [Sprint Board – seznam nalog](#9-sprint-board--seznam-nalog) za podrobnosti o zagonu in ustavitvi števca časa.

---

## 16. Dnevnik dela (Timesheet)

Dostop: **Profile → zavihek Timesheet**.

Na zavihku Timesheet si lahko ogledate in urejate zabeleženi čas po dnevih.

### Pregled vpisov
1. Z izbirnikom datuma izberite dan, za katerega želite videti vpise.
2. Prikaže se seznam nalog, na katerih ste ta dan delali, skupaj z vloženimi urami.

### Urejanje vpisov
1. Poleg posameznega vpisa spremenite število **ur** v vnosnem polju.
2. Kliknite **Shrani** pri tistem vpisu, da shranite spremembo.

### Urejanje preostalega časa naloge
- V istem pogledu lahko za vsako nalogo nastavite **preostale ure** (ocena, koliko dela je še potrebnega).
- Vpišite vrednost v polje **Preostalo** in kliknite **Shrani**.

> Vneseni čas mora biti pozitivno število.

---

## 17. Potrjevanje in zavračanje zgodb *(Produktni vodja)*

Dostop: Sprint Board ob koncu sprinta – kliknite na zgodbo, da se odpre podrobni pogled.

### Potrjevanje zgodbe (mark as realized)
1. Odprite podrobni pogled zgodbe v Sprint Boardu.
2. Kliknite **Potrdi zgodbo** (gumb je viden samo Produktnemu vodji).
3. Zgodba se označi kot **realizirana** in se prestavi v razdelek Realiziranih zgodb v Backlogu.

> Potrjevati je mogoče samo zgodbe, ki so del **tekočega sprinta**.  
> Že potrjene zgodbe ni mogoče znova potrjevati.

### Zavračanje zgodbe (vrni v Backlog)
1. Odprite podrobni pogled zgodbe.
2. Kliknite **Zavrni zgodbo**.
3. Po želji dodajte **komentar** (razlog zavrnitve).
4. Zgodba se vrne v Backlog kot nerealizirana, nima več dodeljenega sprinta.

> Zavrniti je mogoče samo zgodbe tekočega sprinta, ki **še niso realizirane**.

---

## 18. Projektni zid

Dostop: gumb **Zid** na strani projekta.

### Ogled objav
- Na projektnem zidu so prikazane vse objave članov projekta, urejene po datumu.
- Kliknite na objavo, da si ogledate njeno vsebino in komentarje.

### Ustvarjanje objave *(vsi člani projekta)*
1. Kliknite **+ Nova objava**.
2. Vpišite besedilo objave.
3. Kliknite **Objavi**.

### Komentiranje objave *(vsi člani projekta)*
1. Kliknite na objavo, da se odpre podrobni pogled.
2. Vpišite komentar v polje za komentar.
3. Kliknite **Dodaj komentar**.

### Brisanje objave ali komentarja *(Skrbnik metodologije)*
1. V podrobnem pogledu objave kliknite ikono za brisanje (koš) pri objavi ali komentarju.
2. Potrdite brisanje.

> Ob brisanju objave se **samodejno izbrišejo tudi vsi komentarji** k tej objavi.

---

## 19. Diagram Burn-Down

Dostop: zavihek **Burndown Chart** na strani Sprint Boarda.

1. Na strani Sprint Boarda kliknite zavihek **Burndown Chart** (poleg zavihka **Tabla**).
2. Graf prikazuje:
   - **Idealna linija** – linearno zmanjševanje preostalega dela od začetka do konca sprinta.
   - **Dejanska linija** – dejansko preostalo delo na podlagi zabeleženih ur in ocen nalog.
3. Tabela pod grafom prikazuje dnevne vrednosti za obe liniji.

> Vrednosti na grafu se posodabljajo sproti, ko razvijalci beležijo porabljene ure in posodabljajo preostali čas nalog.

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

**Zakaj ne morem urediti ali izbrisati zgodbe?**
Urejanje in brisanje je dovoljeno samo za zgodbe, ki **niso dodeljene nobeni sprintu** in **niso realizirane**. Realizirane zgodbe ostanejo v sistemu kot arhiv.

**Zakaj ne morem dodati zgodbe v sprint?**
Zgodba mora imeti določeno **časovno zahtevnost** in ne sme biti realizirana. Poleg tega skupne točke vseh zgodb v sprintu ne smejo preseči **pričakovane hitrosti** sprinta.

**Zakaj ne vidim gumba za potrjevanje ali zavračanje zgodb?**
Ta gumba sta vidna samo **Produktnemu vodji**. Preverite svojo projektno vlogo.

**Zakaj ne morem izbrisati sprinta?**
Brisati je mogoče samo sprinte, ki se **še niso pričeli**. Aktivnih in zaključenih sprintov ni mogoče brisati.

**Zakaj ne morem urediti objave na zidu?**
Urejanje objav ni podprto. Skrbnik metodologije lahko objavo **izbriše** in jo po potrebi znova ustvari.
