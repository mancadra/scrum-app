
# SPRINT 1
<br>
<br>

## TODO:
- sprejemni testi
- uporabniška dokumentacija
- display lastlogin
- display role za admina
- userpage s podatki
- sprememba gesla
- disable kopiranje gesla
- razkritje gesla pri dodajanju novega uporabnika
- razkritje zadnjega znaka
- razritje zadnjega znaka pri loginu
- display uporabnikov projekta in roli?
- poenoti ostale error displaye (za dodajanje uporabniških zgodb duplicate story name zgleda lepo)


<br>
<br>

## 1 - Dodajanje uporabnikov (Must have)
~~Administrator~~ sistema lahko vnaša nove uporabnike v sistem.

Določi jim uporabniško ime in geslo, osebne podatke (ime, priimek, e-pošta) in sistemske pravice (administrator sistema, uporabnik sistema).

- ~~Določi uporabniško ime, geslo, osebne podatke (ime, priimek, e-pošta) in sistemske pravice~~
- ~~Preveri dodajanje novega uporabnika skupaj s pripadajočimi podatki~~
- ~~Preveri dodajanje uporabnika z obstoječim uporabniškim imenom~~
- ~~Preveri, ali sistem upošteva dodeljene sistemske pravice~~


## 4 - Dodajanje projekta (Must have)
~~Administrator~~ lahko ustvari nov projekt, izbere uporabnike za delo na tem projektu in določi njihove projektne vloge (produktni vodja, skrbnik metodologije, član razvojne skupine).

- ~~Preveri dodajanje novega projekta in morebitno podvajanje imen~~
- ~~Preveri izbiro uporabnikov za projekt~~
- ~~Preveri določitev projektnih vlog~~


## 6 - Ustvarjanje novega Sprinta (Must have)
~~Skrbnik metodologije~~ lahko ustvari nov Sprint. Določi mu začetni in končni datum ter pričakovano hitrost.

- ~~Preveri običajen potek (pravilen datum in hitrost)~~
- ~~Preveri primer, ko je končni datum pred začetnim~~
- ~~Preveri primer, ko je začetni datum v preteklosti~~
- ~~Preveri neregularno vrednost hitrosti~~
- ~~Preveri prekrivanje Sprintov~~ 


## 8 - Dodajanje uporabniških zgodb (Must have)
~~Produktni vodja~~ in ~~skrbnik metodologije~~ lahko vnašata nove uporabniške zgodbe v že obstoječ projekt.

Za vsako zgodbo lahko določita njeno ime, besedilo, sprejemne teste, prioriteto (must have, could have, should have, won't have this time) in poslovno vrednost.

- ~~Preveri regularen potek~~
- ~~Preveri podvajanje imena uporabniške zgodbe~~
- ~~Preveri ustrezno določitev prioritete~~
- ~~Preveri neregularen vnos poslovne vrednosti~~


## 11 - Ocena časovne zahtevnosti (Must have)
~~Skrbnik metodologije~~ lahko nedodeljeni zgodbi v seznamu zahtev določi (oziroma spremeni) oceno časovne zahtevnosti.

- ~~Preveri regularen potek~~
- ~~Preveri veljavnost ocene~~
- Preveri zgodbo, ki je že dodeljena Sprintu


## 13 - Dodajanje zgodb v Sprint (Must have)
Skrbnik metodologije lahko dodaja nove zgodbe v Sprint.

To stori tako, da izbere dogovorjeno podmnožico zgodb v seznamu zahtev in jih dodeli Sprintu. Izbere lahko le tiste zgodbe, ki že imajo ocenjeno časovno zahtevnost in še niso bile realizirane.

- Preveri regularen potek
- Preveri zgodbe brez ocene
- Preveri že realizirane zgodbe
- Preveri že dodeljene zgodbe


## 14 - Dodajanje nalog (Must have)
Skrbnik metodologije in člani razvojne skupine lahko dodajajo nove naloge (tasks) k posamezni uporabniški zgodbi znotraj aktivnega Sprinta.

Določijo opis naloge, oceno časa za dokončanje naloge in po želji tudi člana ekipe za njeno realizacijo (naloga s tem še ni dodeljena, saj jo mora član ekipe prej še sprejeti).

- Preveri regularen potek
- Preveri zgodbo izven aktivnega Sprinta
- Preveri že realizirano zgodbo
- Preveri neregularno oceno časa
- Preveri dodeljevanje člana ekipe


## 16 - Sprejemanje nalog (Must have)
~~Član razvojne~~ skupine lahko sprejme še nedodeljeno nalogo aktivnega Sprinta v delo.

Naloga se označi kot dodeljena, s tem pa se prepreči, da bi jo lahko sprejel še kak drug član.

- Preveri regularen potek
- ~~Preveri nalogo, ki jo je že sprejel drug razvijalec~~
- ~~Preveri nedodeljeno nalogo~~


## 20 - Zaključevanje nalog (Must have)
Član skupine lahko označi svojo nalogo kot zaključeno.

- Preveri regularen potek
- ~~Preveri že zaključeno nalogo~~
- ~~Preveri nedodeljeno nalogo~~


## 25 - Potrjevanje zgodb (Must have)
Produktni vodja lahko ob koncu Sprinta označi uporabniške zgodbe, ki so prestale potrditveni test, kot realizirane.

- Preveri regularen potek
- Preveri že potrjene zgodbe
- Preveri zgodbe izven Sprinta
- Preveri zavrnjene zgodbe
- Preveri nezaključene zgodbe


## 26 - Zavračanje zgodb (Must have)
Produktni vodja lahko ob koncu Sprinta uporabniške zgodbe, ki niso prestale potrditvenega testa ali še niso dokončane, vrne v seznam zahtev kot nerealizirane, pri čemer lahko k zgodbi doda tudi svoj komentar.

- Preveri regularen potek
- Preveri že zavrnjene zgodbe
- Preveri zgodbe izven Sprinta
- Preveri že potrjene zgodbe


## 27 - Seznam zahtev (Must have)
Vsi člani projekta si lahko ogledajo seznam zahtev (Product Backlog), kjer so zbrane vse uporabniške zgodbe projekta.

Zgodbe so jasno razdeljene v dve kategoriji – realizirane (zgodba je realizirana in sprejemni test je bil uspešno opravljen), in nerealizirane (vse ostale zgodbe). Nerealizirane zgodbe so še naprej ločene na dodeljene (pripadajo aktivnemu Sprintu) in nedodeljene (vse ostale).

- Pripravi zgodbe za vse kategorije
- Preveri izpis


## 28 - Seznam nalog (Must have)
Vsi člani projekta si lahko ogledajo seznam nalog (Sprint Backlog), kjer so zbrane uporabniške zgodbe in naloge aktivnega sprinta.

Naloge so razdeljene v štiri kategorije: nedodeljene, dodeljene, zaključene in aktivne (t.j. na njih poteka delo v tem trenutku).

- Pripravi naloge za vse kategorije
- Preveri izpis


## 30 - Prijava v sistem (Must have)
Uporabnik se lahko prijavi v sistem z uporabniškim imenom in geslom.

- ~~Preveri prijavo s pravilnimi podatki~~
- ~~Preveri napačno geslo~~
- ~~Preveri napačno uporabniško ime~~
- ~~Preveri prikaz prijavljenega uporabnika~~
- ~~Preveri dolžino gesla (vsaj 12 znakov)~~
- ~~Preveri omejitve dolžine gesla~~
- ~~Preveri, da se gesla ne krajšajo~~
- ~~Preveri spremembo gesla~~
- ~~Preveri zahtevo po starem in novem geslu~~
- ~~Preveri razkritje gesla~~
- ~~Preveri razkritje zadnjega znaka~~
- Preveri password meter
- ~~Preveri prepoved kopiranja gesla~~
- Preveri hashiranje gesel
- Preveri dvofaktorsko avtentikacijo
- ~~Preveri preverjanje gesla s slovarjem ~~ 


<br>
<br>

# SPRINT 2

## 2 - Vzdrževanje uporabniških računov (Could have)
Administrator sistema lahko ureja in briše obstoječe uporabnike sistema. Spremeni jim lahko uporabniško ime, osebne podatke, geslo in sistemske pravice.

- Preveri brisanje obstoječega uporabnika
- Preveri morebitno podvajanje pri spremembi uporabniškega imena
- Preveri možnost spreminjanja osebnih podatkov uporabnika
- Preveri spremembo gesla obstoječega uporabnika
- Preveri spremembo sistemskih pravic


## 3 - Spreminjanje lastnih uporabniških podatkov (Could have)
Uporabnik sistema lahko za svoj uporabniški račun spreminja uporabniško ime, geslo in druge osebne podatke.

- Preveri spremembo uporabniškega imena in morebitno podvajanje
- Preveri spremembo gesla
- Preveri spremembo drugih osebnih podatkov


## 5 - Vzdrževanje projekta (Should have)
Administrator sistema in skrbnik metodologije lahko urejata lastnosti že obstoječega projekta, dodajata nove člane v projekt, urejata vloge obstoječih članov v projektu in odstranjujeta člane iz projekta.

- Preveri dodajanje novega člana projektne skupine
- Preveri odstranjevanje člana iz projektne skupine
- Preveri spreminjanje vlog članov
- Preveri spremembo imena projekta in podvajanje


## 7 - Vzdrževanje Sprintov (Should have)
Skrbnik metodologije lahko ureja ali briše Sprinte, ki se še niso pričeli.

- Preveri spremembo datumov (vsi robni primeri)
- Preveri spremembo hitrosti Sprinta


## 9 - Urejanje in brisanje uporabniških zgodb (Should have)
Produktni vodja in skrbnik metodologije lahko urejata in brišeta tiste uporabniške zgodbe v projektu, ki še niso realizirane in niso dodeljene nobenemu Sprintu.

- Preveri regularen potek
- Preveri zgodbo, ki je že bila dodeljena Sprintu
- Preveri že realizirano zgodbo
- Preveri podvajanje imena


## 10 - Dodajanje opomb k zgodbam (Should have)
Člani razvojne skupine lahko k uporabniškim zgodbam v dogovoru s produktnim vodjo ali skrbnikom metodologije dopisujejo svoje opombe.

- Preveri regularen potek


## 12 - Planning poker (Could have)
Skrbnik metodologije lahko za nedodeljeno uporabniško zgodbo začne igro 'Planning Poker', v kateri lahko sodelujejo vsi člani projekta, prijavljeni v tistem trenutku.

Skrbnik metodologije in razvijalci lahko oddajajo svoje ocene. Skrbnik metodologije lahko igro zaključi.

- Preveri regularen potek
- Preveri vidnost ocen
- Preveri pravilno sosledje krogov
- Preveri vpis končne ocene


## 15 - Vzdrževanje nalog (Should have)
Skrbnik metodologije in člani razvojne skupine lahko urejajo vse parametre in brišejo obstoječe naloge (tasks) pri posameznih uporabniških zgodbah.

- Preveri regularen potek
- Preveri brisanje že sprejete naloge


## 17 - Odpovedovanje nalogam (Must have)
Član razvojne skupine se lahko že sprejeti nalogi odreče in s tem omogoči, da delo na njej nadaljuje kak drug član.

- Preveri regularen potek
- Preveri nalogo, ki ni bila sprejeta
- Preveri prevzem naloge s strani drugega člana


## 18 - Beleženje porabe časa (Must have)
Član razvojne skupine lahko beleži porabo časa na neki nalogi (lahko prične z delom na nalogi, ki jo je sprejel; ob tem se zažene števec časa, ki beleži čas njegovega dela; naloga se označi kot aktivna).

Član razvojne skupine lahko konča delo na trenutno aktivni nalogi. Ob tem se števec časa zaključi, vloženo delo (število ur) pa se zabeleži v bazo. V primeru, da je ta član v istem dnevu že delal na tej nalogi, se število ur le prišteje k že obstoječemu vpisu.

- Preveri regularen potek
- Preveri veljavnost vnesenega časa
- Preveri nalogo, ki ni bila sprejeta
- Preveri že zaključene zgodbe


## 19 - Pregledovanje časa (Should have)
Član skupine lahko pregleduje in dopolnjuje preglednico svojega dela na nalogah v tekočem dnevu in v preteklih dnevih.

Lahko popravlja število vloženih ur na posamezni nalogi za posamezni dan. Prav tako lahko po svoji presoji določa potrebno število ur za dokončanje naloge.

- Preveri regularen potek
- Preveri veljavnost časa
- Preveri nalogo brez sprejema
- Preveri zaključene zgodbe


## 21 - Dokumentacija (Could have)
Vsi sodelujoči na projektu lahko urejajo uporabniško dokumentacijo za projekt. Lahko jo tudi uvozijo ali izvozijo v nek standarden besedilni format.

- Preveri urejanje dokumentacije
- Preveri uvoz podatkov
- Preveri izvoz dokumentacije


## 22 - Projektni zid (Could have)
Vsi sodelujoči na projektu lahko na projektni zid pripenjajo nove objave.

- Preveri dodajanje objav


## 23 - Komentiranje objav
Vsi sodelujoči na projektu lahko komentirajo objave na projektnem zidu.

- Preveri komentiranje


## 24 - Brisanje objav (Could have)
Skrbnik metodologije lahko briše objave in komentarje na projektnem zidu.

- Preveri brisanje objave
- Preveri brisanje objave s komentarji


## 29 - Burn-Down diagram (Should have)
Vsi člani projekta si lahko ogledajo grafikon 'Burndown Chart' za celotni projekt, kjer je tabelarično in grafično prikazana primerjava vloženega dela s preostalim delom na projektu.

- Vnesi podatke o času
- Preveri pravilnost izrisa
