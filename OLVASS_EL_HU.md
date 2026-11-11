# Prophetero Scene Planner — nyilvános H3 béta

Külön, nagy böngészőoldalon megnyíló jelenettervező a DaSiWa/Eros H3 Simple és Pro workflow-khoz. Képek, kivágás, időzítés, kulcsképek, jelenetprompt, hangutasítás és LoRA-k tervezésére. Nem generál és nem indít futtatást.

## Első használat

1. Bontsd ki az egész ZIP-et. Állítsd le a SwarmUI/ComfyUI-hátteret, majd INSTALL.cmd.
2. A tényleges ComfyUI backend mappáját válaszd, amelyben a main.py van, ne a mentett workflow-k könyvtárát. SwarmUI mellett annak beállított backendjét használd.
3. Teljes újraindítás után Ctrl+F5 a ComfyUI-oldalon.
4. Nyisd meg a működő H3-workflow-t. A H3-node Open Scene Planner gombja vagy a vászon jobb klikkes Prophetero · Scene Planner menüje átveszi az aktuális gráfot. Külön indító JSON is van; azt nem kell futtatni.
5. Ellenőrizd a forrást. Régi piszkozat megjelenhet; a forrás cseréjét külön jóvá kell hagyni. Sablonnál válassz sablont és kattints a Sablon használata gombra.
6. Húzz be képet, válaszd ki a kártyáját, állítsd Kezdőképre. Legyen pontosan egy kezdőkép, legfeljebb egy zárókép, összesen legfeljebb hat kép. A köztes időpontok különbözzenek és a két végpont közé essenek.
7. Válassz képméretet és kért hosszt. Van 1088 × 608, kisebb próbaméret, álló/fekvő/négyzetes és egyéni méret is. A nagy méret elfogadása nem jelenti azt, hogy elég hozzá a videómemória.
8. A kivágást a nagy előnézet húzásával vagy a csúszkákkal állíthatod. Egész kép esetén szegély lehet, kitöltésnél vágás. A zárókép ideje az utolsó képkocka időbélyege, nem a teljes videóhossz.
9. Írd meg az alapjelenetet és az opcionális eseményeket/hangutasítást. Összeállítás után a prompt szerkeszthető és másolható. A hangterv szöveges kérés, nem tényleges hanggenerálás vagy szájszinkron.
10. A lenyitható LoRA-panel a bekapcsolt sorokat mutatja. A kikapcsolt sorokat külön pipával hozhatod vissza. Helyi keresés/hozzáadás, erősségek és forrás-visszaállítás elérhető; a kompatibilitás nem állapítható meg a fájlnévből.
11. Változtatások áttekintése: bal oldalt a beolvasott forrás változatlan pillanatképe, jobb oldalt a készülő JSON beállításai. A későbbi ComfyUI-módosításokhoz új forrásbeolvasás kell.
12. Projekt mentése: később a tervezőben folytatható. Új workflow JSON mentése: ComfyUI-ba tölthető. Két külön fájltípus! A generálást a ComfyUI-ban te indítod.

## Időzítés — fontos

A 10 kért másodperc például 243 / 24 = 10,125 másodperc tényleges idő lehet. A tervező H3-hoz igazított képkockaszámot használ. A hossz megváltoztatásakor itt állítsd a Kért másodpercet, majd ments új JSON-t. A régi, más ághoz tartozó Duration mező nem feltétlenül vezérli az aktív kimenetet. Az elkészült export nem frissül magától.

## Mentés és követelmények

A projektfájl saját képeket és promptokat is tartalmazhat. A böngésző piszkozata nem biztonsági mentés. Az exportált workflow a ComfyUI/input/PropheteroScenePlanner/<azonosító> képeire hivatkozik: másik gépre ezek is kellenek, vagy új képeket kell kiválasztani. A nyilvános csomag személyes munkákat nem tartalmaz.

A modellek, encoder, VAE-k és külső node-ok külön telepítendők. Lásd DEPENDENCIES.md. Opcionális fordításhoz külön Ollama és telepített szöveges modell szükséges; GPU-igényes generálással egyszerre ne terheld túl a gépet.

Ez a kiadás H3 Simple/Pro béta; LTX nincs benne. A kulcsképek és időzített szövegek iránymutatások, nem garantált mozgások vagy vágások. Kezdj rövid próbával. A telepítő Windows alatt ellenőrzött; Linux/macOS itt nincs tesztelve.

Ingyenes alkotói használat, üzleti célú munkákhoz is. A program és módosított változatai nem értékesíthetők tovább vagy fizetős csomagban. A teljes feltételek a LICENSE.txt-ben vannak. A modellek saját licence ettől független.
