# ZERO-DAY: samajh lo, phir submit karo

Ye file tumhare liye hai, judges ke liye nahi. Submit karne se pehle ise ek baar padh lo, taaki koi "ye kaise banaya?" puchhe to tum bata sako.

## Kaise chalayein
`index.html` pe double-click karo. Bas. Internet chahiye sirf Google Fonts ke liye (bina internet ke bhi chalega, bas font alag dikhega).

## Files ka naksha

| File | Kya karti hai |
|---|---|
| `index.html` | Home: radar + tumhare device ki 12 readings |
| `xray.html` | UV Lab: fake checkout pe torch ghumao |
| `vault.html` | Password tester, link cleaner, audio tap |
| `contact.html` | Incident Desk: form + live case summary |
| `style.css` | Sabhi pages ka design (colours `:root` mein hain, sabse upar) |
| `common.js` | Chhote helpers: popup (toast), copy, mobile menu |
| `recon.js` | Home page ka scanner |
| `xray.js` | UV torch ka logic |
| `vault.js` | Password, link aur audio tools |
| `contact.js` | Form validation + case summary |

## Teen "wow" cheezein kaise kaam karti hain

### 1. Device scan (recon.js)
Browser kuch cheezein har website ko bina puchhe de deta hai. Hum bas unhe padhte hain:
- `navigator.getBattery()` se battery (sirf Chrome/Edge deta hai)
- WebGL ka `WEBGL_debug_renderer_info` se graphics card ka naam
- `screen.width`, `navigator.hardwareConcurrency`, `navigator.deviceMemory`, `navigator.connection` se screen, CPU, RAM, network
- Canvas pe ek chhota drawing banake uska hash nikalte hain. Har device usse thoda alag draw karta hai, isliye ye "signature" ban jaata hai.
- Sab readings ko mila ke ek `ZD-xxxx-xxxx` fingerprint banta hai (`hash53` function).

**Dhyan rakho:** Firefox aur Safari kai cheezein chhupa dete hain. Tab card pe "Shielded" likha aata hai. Ye bug nahi hai, ye privacy ki jeet hai. Kuch bhi server pe nahi jaata, sab usi page pe dikhta hai.

### 2. UV torch (xray.js + style.css)
Trick ye hai:
1. JavaScript fake shop ki ek **copy** banata hai (`cloneNode`) aur use upar rakhta hai, alag UV rangon mein.
2. CSS `mask-image: radial-gradient(...)` se us copy ka sirf ek gol hissa dikhta hai.
3. Mouse hilne par us gol hisse ki jagah (`--tx`, `--ty`) badal di jaati hai. Bas, torch ban gayi.
4. Har chhupi cheez (`data-trap`) ki position check hoti hai. Torch ke paas aate hi case file mein clue add ho jaata hai.

Keyboard waalon ke liye har clue pe "Reveal" button hai.

### 3. Vault (vault.js)
- **Password:** hum character ki type (a-z, A-Z, 0-9, symbols) se possible combinations ginte hain. Repeats, `1234`, `qwerty` jaisi cheezein aur common passwords ko kam ginte hain. Phir time = combinations / guesses per second. Do speeds: website login (100/sec) aur stolen database pe GPU (100 billion/sec). **Ye andaza hai, exact nahi**, aur page pe yahi likha hai.
- **Link cleaner:** `new URL()` se link todte hain. `utm_`, `fbclid`, `gclid` jaise tracking parts hata dete hain. Phir shape check hota hai: IP address, `@` ki trick, brand ka naam subdomain mein, `.top`/`.xyz` jaise ending, `http` wagairah. Ye link kabhi **kholta nahi**.
- **Audio tap:** `AudioContext` + `AnalyserNode` awaaz ko frequency numbers mein badalta hai, aur `<canvas>` pe bars banate hain. Mic sirf button dabane par chalta hai aur browser pehle permission puchhta hai. Awaaz record ya save nahi hoti. "Test signal" wala mode silent hai.

### 4. Incident Desk (contact.js)
Form mein kuch bhi likho, dahine side ki case file turant badalti hai (`renderDossier`). Validation har field pe (email, 10-digit mobile, future date nahi, description kam se kam 20 akshar). Print button ke liye CSS ka `@media print` sirf case file dikhata hai. Download button `Blob` se `.txt` file banata hai.

## Judges se kya bolna hai (30 second)
"Ye ek scam forensics lab hai. Pehle page pe site dikhati hai ki browser bina puchhe kitna kuch bata deta hai, taaki log fingerprinting samjhein. UV Lab mein fake checkout ke 8 dark patterns hain. Vault mein password aur links check hote hain. Incident Desk mein koi scam report karne se pehle case summary bana sakta hai. Sab HTML, CSS aur JavaScript mein hai, koi framework ya server nahi."

## Puchhe ja sakne waale sawal
- **"Battery kaise pata chali?"** `navigator.getBattery()`, browser ki built-in API. Sirf Chrome/Edge deta hain.
- **"Kya ye data bhej raha hai?"** Nahi. Koi server hai hi nahi. Code mein `fetch` ya `XMLHttpRequest` dhoondh lo, nahi milega.
- **"Password tester accurate hai?"** Andaza hai. Real tools jaise zxcvbn zyada patterns jaante hain.
- **"Fake shop kisi real brand ki copy hai?"** Nahi. QuickKart imaginary naam hai, aur isme card form bhi nahi hai.

## Apna naam daalna
Har page ke footer mein (`<footer>` ke andar `<p>`) ye line hai: `ZERO-DAY is a learning project made for Ignite Club, Week 8.` Isme apna naam aur college jod do, jaise `Made by <tumhara naam>, <college>`. Har page mein ek jagah.

## Rang badalna
`style.css` ke sabse upar `:root { ... }` mein `--uv` (purple), `--evidence` (peela), `--alert` (laal), `--safe` (hara). Wahin se badlo, poori site badal jaayegi.

## Online daalna (link submit karne ke liye)
1. **Netlify Drop:** netlify.com/drop pe poora folder drag karo. 1 minute mein link.
2. **GitHub Pages:** repo banao, files upload karo, Settings > Pages > main branch chuno.

Mic wali cheez online (https) pe sabse achhi chalti hai.

## Jo maine nahi kiya (jaanbujh ke)
- Camera, location aur clipboard ko haath nahi lagaya. Judge ko darana nahi hai, samjhana hai.
- "FIR" ki copy nahi banayi. Case summary ke neeche likha hai ki ye FIR nahi hai. Asli reporting ke liye 1930 aur cybercrime.gov.in hai (submit se pehle ek baar khud check kar lena ki ye abhi bhi sahi hain).
