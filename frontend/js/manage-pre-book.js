/* =========================================
   FILE: manage-pre-book.js
   ========================================= */

const API_BASE_URL = 'https://reading-journal.xyz'; 

// ===============================
// GLOBAL ELEMENTS
// ===============================
const selectionPage = document.getElementById('book-selection-page');
const thankYouPage = document.getElementById('thank-you-page');
const prevArrow = document.getElementById('prevArrow');
const nextArrow = document.getElementById('nextArrow');
const statusSpan = document.getElementById('selectionStatus');
const unselectAllBtn = document.getElementById('unselectAllBtn');
const finishBtn = document.getElementById('finishBtn');
const searchInput = document.getElementById('searchInput');
const backBtn = document.getElementById("backBtn");

// UI Info Elements
const pageIndicator = document.getElementById("pageIndicator");
const totalCountDisplay = document.getElementById("totalCountDisplay");

const startBtn = document.querySelector('.start-btn');
const API_URL = "/api/search";

// State Variables
let currentSlide = 1;
let totalSlidesCount = 1; 
let selectedBooks = new Set(); 
let allBooksOriginal = []; 

// ===============================
// 1. LOCAL STORAGE & BACK BUTTON
// ===============================
function loadLocalBooks() {
    try {
        const pref = JSON.parse(localStorage.getItem("preference") || "{}");
        if (pref.books && Array.isArray(pref.books)) {
            selectedBooks = new Set(pref.books);
        }
    } catch (e) { console.error(e); }
}

function saveLocalBooks() {
    try {
        let pref = JSON.parse(localStorage.getItem("preference") || "{}");
        pref.books = Array.from(selectedBooks);
        localStorage.setItem("preference", JSON.stringify(pref));
    } catch (e) { console.error(e); }
}

if (backBtn) {
    backBtn.addEventListener("click", () => {
        saveLocalBooks();
        window.location.href = "manage-pre-author.html";
    });
}

// ===============================
// 2. FETCH BOOKS (สำหรับ Search)
// ===============================
async function fetchBooks(keyword = "") {
    const query = `
        query SearchBooks($keyword: String!, $page: Int!) {
            search(query: $keyword, query_type: "Book", page: $page) {
                results
            }
        }
    `;

    const MAX_PAGE = keyword ? 2 : 5; 
    let page = 1;
    let allHits = [];

    if(keyword) totalCountDisplay.textContent = "Searching...";
    else totalCountDisplay.textContent = "Loading...";

    while (page <= MAX_PAGE) {
        try {
            const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query, variables: { keyword, page } })
            });

            const json = await res.json();
            const hits = json?.data?.search?.results?.hits;

            if (!Array.isArray(hits) || hits.length === 0) break;
            
            const validHits = hits.filter(h => h.document).map(h => h.document);
            allHits.push(...validHits);

            if (hits.length < 20) break; 
            page++;

        } catch (err) {
            console.error("Fetch error:", err);
            break;
        }
    }

    return allHits.map(doc => ({
        id: doc.id || doc.slug,
        title: doc.title,
        image: { url: doc.image?.url },
        contributions: doc.contributions || []
    }));
}

// ===============================
// 3. LOAD BOOKS (Static List + Image + ID)
// ===============================
async function loadBooks() {
    // 🔥 List หนังสือเรียงตามลำดับที่คุณต้องการ พร้อม ID และรูปภาพครบถ้วน
    const priorityList = [
        { title: "Harry Potter and the Sorcerer's Stone", id: "328491", image: "https://assets.hardcover.app/editions/3890025/4883525795702759-58613380.jpg" },
        { title: "The Lord of the Rings", id: "377938", image: "https://assets.hardcover.app/external_data/41547254/141872f0e71efe38f937b72879a5dea52e502db5.jpeg" },
        { title: "The Hobbit", id: "382700", image: "https://assets.hardcover.app/edition/8548995/27d187cb1a0bec4b21ebfc53658388bc8b071256.jpeg" },
        { title: "A Game of Thrones", id: "644", image: "https://assets.hardcover.app/edition/12841472/a63e7ea1-9064-4eb8-afb4-5372db40aed2.jpg" },
        { title: "The Hunger Games", id: "88639", image: "https://assets.hardcover.app/editions/1589497/2979196565308831-lf%202.jpeg" },
        { title: "Twilight", id: "302088", image: "https://assets.hardcover.app/edition/19228247/0e4edc828d09c7efd08df09e37b04aab3f4026dd.jpeg" },
        { title: "Percy Jackson", id: "219252", image: "https://assets.hardcover.app/edition/11185124/b076b406ccdf683e9fb871f8aa24c041ae354514.jpeg" },
        { title: "The Da Vinci Code", id: "373163", image: "https://assets.hardcover.app/editions/30400169/2520023766251547.jpeg" },
        { title: "Angels & Demons", id: "123621", image: "https://assets.hardcover.app/editions/28693581/9565539320945004.jpeg" },
        { title: "The Girl with the Dragon Tattoo", id: "1218611", image: "https://assets.hardcover.app/edition/31243684/8b91d3f83bad4222f9cb560d1932def9ec8ce8fa.jpeg" },
        { title: "To Kill a Mockingbird", id: "149361", image: "https://assets.hardcover.app/edition/22780788/eef525120e32b6eca1070bbfb2b63a11d324579d.jpeg" },
        { title: "1984", id: "379760", image: "https://assets.hardcover.app/external_data/35434356/b1ffbb921e779f0542a441b33fbe504281991e50.jpeg" },
        { title: "Animal Farm", id: "356467", image: "https://assets.hardcover.app/edition/31488479/fe6ec5f0-ab7e-4448-b5f7-26ef763c328f.jpg" },
        { title: "The Catcher in the Rye", id: "381379", image: "https://assets.hardcover.app/editions/20025793/2524829738512264-91YXaY-I9VS._SL1500_.jpg" },
        { title: "The Great Gatsby", id: "377193", image: "https://assets.hardcover.app/external_data/27597898/6cb93bdc8f29bc483f692644c829ab97a7f17716.jpeg" },
        { title: "Pride and Prejudice", id: "379647", image: "https://assets.hardcover.app/edition/17099953/d652482fbc1a73c5df99b64160910c99fafa2b94.jpeg" },
        { title: "Jane Eyre", id: "295454", image: "https://assets.hardcover.app/books/295454/424285-L.jpg" },
        { title: "Wuthering Heights", id: "386401", image: "https://assets.hardcover.app/edition/10342255/9cd80aacd1d00db0d02a6d0019bc5cb946871387.jpeg" },
        { title: "Little Women", id: "374551", image: "https://assets.hardcover.app/edition/29525647/8235491-L.jpg" },
        { title: "The Kite Runner", id: "71101", image: "https://assets.hardcover.app/editions/30406169/3842999574958230.jpg" },
        { title: "Life of Pi", id: "259662", image: "https://assets.hardcover.app/edition/2710952/ab0c82bcd276351dc588e52bd6da50482b8103f1.jpeg" },
        { title: "The Book Thief", id: "300042", image: "https://assets.hardcover.app/editions/30399827/3081662300594446.jpg" },
        { title: "The Alchemist", id: "337236", image: "https://assets.hardcover.app/editions/30399646/6724991536065856.jpg" },
        { title: "The Little Prince", id: "115005", image: "https://assets.hardcover.app/editions/30426444/4807756302554780-157993.jpg" },
        { title: "Dune", id: "312460", image: "https://assets.hardcover.app/editions/30426415/8362709973192601-9780441013593-us.jpg" },
        { title: "Ender's Game", id: "158268", image: "https://assets.hardcover.app/external_data/61075411/dd7e2678859a7230551382016b03219be682e693.jpeg" },
        { title: "Ready Player One", id: "26363", image: "https://assets.hardcover.app/external_data/60193667/e18b39394792e119f99b0a51aa170aa3c61de368.jpeg" },
        { title: "Project Hail Mary", id: "427578", image: "https://assets.hardcover.app/editions/3274049/8741341047797682-91mYu67RfUL._SL1500_.jpg" },
        { title: "The Martian", id: "292354", image: "https://assets.hardcover.app/editions/21716111/5323176149970177.jpg" },
        { title: "The Name of the Wind", id: "379217", image: "https://assets.hardcover.app/editions/19454574/9509867934646082.jpg" },
        { title: "Mistborn", id: "369692", image: "https://assets.hardcover.app/external_data/31614753/800579f7d675e7d2cd01043ddc57eb6ff724a6a5.jpeg" },
        { title: "The Way of Kings", id: "386446", image: "https://assets.hardcover.app/edition/3134360/a18d937805a28e3214a556442c8d33f41c02f2cb.jpeg" },
        { title: "American Gods", id: "657", image: "https://assets.hardcover.app/external_data/30222505/3e02a50c5ecf68835504b66795c7553ae9cc6d98.jpeg" },
        { title: "Good Omens", id: "434342", image: "https://assets.hardcover.app/edition/25781438/e82f7695d3fb5f077c3a997a1359c639fdf7f891.jpeg" },
        { title: "The Hitchhiker's Guide to the Galaxy", id: "2086789", image: "https://assets.hardcover.app/external_data/1288138/45db967d943869b84552d7137a0662d6a6cedfe5.jpeg" },
        { title: "Brave New World", id: "374328", image: "https://assets.hardcover.app/edition/3299811/3e542fb1d6aed92c0f4e9cd0ac9b2f6892ca97a3.jpeg" },
        { title: "Fahrenheit 451", id: "375938", image: "https://assets.hardcover.app/edition/6336191/3d353406f14fd36043a8bdfb8c3288f90ee4f96c.jpeg" },
        { title: "Neuromancer", id: "313448", image: "https://assets.hardcover.app/editions/30401722/203725739738019-PxOL.jpg" },
        { title: "Dark Matter", id: "57214", image: "https://assets.hardcover.app/book_mappings/7332342/e3c5928fc0a24ca97940c68f03dd2b503e42ba4f.jpeg" },
        { title: "The Shining", id: "280359", image: "https://assets.hardcover.app/edition/30391363/8303e07a-72c2-4cea-9dc2-3d22dcd563ce.jpg" },
        { title: "It", id: "373525", image: "https://assets.hardcover.app/edition/1151040/20be03e800cfe9caa71c646d3ee6bda99ad43793.jpeg" },
        { title: "Sherlock Holmes", id: "17516", image: "https://assets.hardcover.app/external_data/60781686/11479a8d15c6bc2f0e47e96c4a2a7ee861859612.jpeg" },
        { title: "It Ends with Us", id: "379737", image: "https://assets.hardcover.app/edition/18408277/a9e8d2b6-3538-42b1-b872-2f5609fc06f7.jpg" },
        { title: "The Seven Husbands of Evelyn Hugo", id: "340654", image: "https://assets.hardcover.app/edition/30400854/26c67fc06856b60a465680539c0c0b327be861de.jpeg" },
        { title: "Daisy Jones & The Six", id: "447329", image: "https://assets.hardcover.app/external_data/60647726/44783b6065c62f5173370ebe5d08c21faa84f83f.jpeg" },
        { title: "Normal People", id: "61787", image: "https://assets.hardcover.app/editions/30402559/2802629647590855.jpeg" },
        { title: "Where the Crawdads Sing", id: "428261", image: "https://assets.hardcover.app/editions/22309128/6102116956447505.jpg" },
        { title: "The Notebook", id: "383393", image: "https://assets.hardcover.app/external_data/59371391/9a5e9ccbbc538831e02c2332370615f40cdd174d.jpeg" },
        { title: "Crazy Rich Asians", id: "427499", image: "https://assets.hardcover.app/external_data/60085850/34875c9d11195cd2710db1f1c597885ffbcfc748.jpeg" },
        { title: "Sapiens", id: "687879", image: "https://assets.hardcover.app/edition/30675176/content.jpeg" },
        { title: "Atomic Habits", id: "428023", image: "https://assets.hardcover.app/editions/30400296/214994214060325.jpg" },
        { title: "Educated", id: "1018039", image: "https://assets.hardcover.app/edition/31042592/7bdf2572e476d981cb3c9bd99e55f6d809ae3521.jpeg" },
        { title: "Becoming", id: "337", image: "https://assets.hardcover.app/external_data/23200978/fd767670cf0a77ece2fa7069cb3859f48aa71439.jpeg" },
        { title: "The Psychology of Money", id: "431486", image: "https://assets.hardcover.app/editions/30402080/2750873312297770.jpg" },
        { title: "Norwegian Wood", id: "776952", image: "https://assets.hardcover.app/edition/12721462/13f19c67b1f83ab4aadfcb3676a999e1f171754c.jpeg" },
        { title: "Kafka on the Shore", id: "207877", image: "https://assets.hardcover.app/editions/31491275/5427275157910645.jpg" },
        { title: "1Q84", id: "427687", image: "https://assets.hardcover.app/editions/28550547/2665591638920066.jpg" },
        { title: "Memoirs of a Geisha", id: "82069", image: "https://assets.hardcover.app/edition/25729231/6ba53f20cc0e345e112d84ea41adea26d2b5ade9.jpeg" },
        { title: "Circe", id: "383598", image: "https://assets.hardcover.app/editions/187333/9694237244087422-circe.jpg" },
        { title: "The Song of Achilles", id: "80378", image: "https://assets.hardcover.app/editions/8933288/8719175186248367.jpg" },
        { title: "Red, White & Royal Blue", id: "381772", image: "https://assets.hardcover.app/edition/30399344/a1c3324b-c9c5-439e-83fd-a03be771d151.jpg" },
        { title: "The Love Hypothesis", id: "428778", image: "https://assets.hardcover.app/editions/1269356/156195945316162-56732449.jpg" },
        { title: "Book Lovers", id: "454009", image: "https://assets.hardcover.app/external_data/61220701/4cb58960916d116b666e35244b5e26ed63ad4e6d.jpeg" },
        { title: "Beach Read", id: "429002", image: "https://assets.hardcover.app/external_data/48576554/6b6d4fef932cec05d39965ea089c8dcaaf74128d.jpeg" },
        { title: "Thinking, Fast and Slow", id: "242841", image: "https://assets.hardcover.app/external_data/32475567/ddc6d0b45faff3b36560a5663e4ff2d2efb63740.jpeg" },
        { title: "Quiet", id: "987776", image: "https://assets.hardcover.app/external_data/60147603/76c6fa21184c43ed3337a485bede5c9aee6fa87f.jpeg" },
        { title: "Steve Jobs", id: "294341", image: "https://assets.hardcover.app/books/294341/10646542-L.jpg" },
        { title: "Born a Crime", id: "1176707", image: "https://assets.hardcover.app/external_data/60337763/0080057f734d8788a6e28a8f51e46185ea4205d0.jpeg" },
        { title: "Man's Search for Meaning", id: "495645", image: "https://assets.hardcover.app/edition/30443934/9e06b9cfae5eb17e4d071c9caaeda029fcf353df.jpeg" },
        { title: "Rich Dad Poor Dad", id: "185229", image: "https://assets.hardcover.app/book_mappings/7333074/2577f28cf922190c76807b6aeff4bfcee786baf0.jpeg" },
        { title: "The Subtle Art of Not Giving a F*ck", id: "242987", image: "https://assets.hardcover.app/edition/30399292/a3245f04ade5bdaf35f10aa0bd44ef7cbf99466a.jpeg" },
        { title: "Outliers", id: "1581947", image: "https://assets.hardcover.app/external_data/818933/292547e367f102fb9877f138e8d7fc9599551b24.jpeg" },
        { title: "Into the Wild", id: "260114", image: "https://assets.hardcover.app/external_data/24102049/f5254d29bd0395f51478338f8f7df80cf1a6a3b8.jpeg" },
        { title: "The Diary of a Young Girl", id: "469437", image: "https://assets.hardcover.app/external_data/59324031/949834d4214c0211c089c2eeacfb358b24b554c4.jpeg" },
        { title: "Frankenstein", id: "28722", image: "https://assets.hardcover.app/external_data/46789420/6823e1155b2785ae31ac59ccb752c4f33b599b35.jpeg" },
        { title: "Dracula", id: "1209317", image: "https://assets.hardcover.app/external_data/60367909/8374e1845e4e5ca8b55bed8018d6a029d14c722a.jpeg" },
        { title: "The Picture of Dorian Gray", id: "610706", image: "https://assets.hardcover.app/edition/30582844/content.jpeg" },
        { title: "Les Misérables", id: "370972", image: "https://assets.hardcover.app/edition/8527300/4a29abc0289f96bcbf3a0eddf0a0c95777d0500c.jpeg" },
        { title: "Crime and Punishment", id: "469783", image: "https://assets.hardcover.app/edition/9607814/495cb96fd40579474d87f8950c30e38380b6222a.jpeg" },
        { title: "War and Peace", id: "474003", image: "https://assets.hardcover.app/external_data/47670798/31ff7c727331838391c9f425f4ffecbe44be8b79.jpeg" },
        { title: "Anna Karenina", id: "376783", image: "https://assets.hardcover.app/edition/30400744/802b860ad3a7f481dc35b2a8b2b1ede7628707d3.jpeg" },
        { title: "One Hundred Years of Solitude", id: "762271", image: "https://assets.hardcover.app/edition/31690057/1072e91e67d3953a7d35bbb0ac44138a8bc600c8.jpeg" },
        { title: "Beloved", id: "374373", image: "https://assets.hardcover.app/editions/17695341/9080646121191414.jpg" },
        { title: "The Color Purple", id: "166182", image: "https://assets.hardcover.app/external_data/660181/530952d31119e374544215fcdd4c0fd7049e2ebe.jpeg" },
        { title: "The Handmaid's Tale", id: "377799", image: "https://assets.hardcover.app/external_data/60350995/067edb0a584fce8c8e4aa3bcbf7449249f5630e1.jpeg" },
        { title: "The Giver", id: "262039", image: "https://assets.hardcover.app/book_mappings/7332318/b23de44fadf6eca2f7196c4aa3efbec84b748a35.jpeg" },
        { title: "Eragon", id: "316971", image: "https://assets.hardcover.app/editions/30399869/8816624490580869-91JrDpvTiML._SL1500_.jpg" },
        { title: "Throne of Glass", id: "39629", image: "https://assets.hardcover.app/edition/30501042/9052e867e43511a1f2ec7dc8ce0e33d01faf7c6e.jpeg" },
        { title: "A Court of Thorns and Roses", id: "428290", image: "https://assets.hardcover.app/external_data/27599647/a7e4c34149071bee70a437d0d9cee1bc56eacf47.jpeg" },
        { title: "Shadow and Bone", id: "312762", image: "https://assets.hardcover.app/editions/30503452/2167790222047428.jpeg" },
        { title: "Six of Crows", id: "1898835", image: "https://assets.hardcover.app/book_mappings/7332359/142e2ae1b4ad7375fdedc9200564c9b3b21cb117.jpeg" },
        { title: "The Cruel Prince", id: "98065", image: "https://assets.hardcover.app/external_data/43188318/6bc821e0bdc3de2d6287ec023ef5cafc425ebdd0.jpeg" },
        { title: "Fourth Wing", id: "714600", image: "https://assets.hardcover.app/editions/30707731/3559167047761380.jpeg" },
        { title: "Iron Flame", id: "747398", image: "https://assets.hardcover.app/external_data/60991785/2bd76bde6a03cb77c6cdbdc7b6e045744e1ef5ff.jpeg" },
        { title: "Maze Runner", id: "603132", image: "https://assets.hardcover.app/edition/30573524/10839364-L.jpg" },
        { title: "Divergent", id: "109344", image: "https://assets.hardcover.app/edition/22182301/7276222-L.jpg" },
        { title: "The Fault in Our Stars", id: "197990", image: "https://assets.hardcover.app/external_data/42441742/f0fe7614243ae255ef797f894e263adeb97cd666.jpeg" },
        { title: "Looking for Alaska", id: "368817", image: "https://assets.hardcover.app/editions/22819899/6306310531049300.jpg" },
        { title: "Paper Towns", id: "216957", image: "https://assets.hardcover.app/edition/31502632/4f7e46c127d9582be4ef5cde546a728f6a463b7a.jpeg" },
        { title: "Eleanor & Park", id: "228459", image: "https://assets.hardcover.app/external_data/61112092/2605460cce5c374c220fcc8d03b8b55db5694a78.jpeg" },
    ];

    const norm = str => str ? str.toLowerCase().replace(/[^a-z0-9]/g, "") : "";

    let finalBooks = [];

    // Loop สร้างข้อมูลหนังสือจาก List ของเราโดยตรง
    priorityList.forEach((item, index) => {
        let imageUrl = item.image;
        if (!imageUrl) {
            imageUrl = `https://placehold.co/150x220/333/FFF?text=${encodeURIComponent(item.title)}`;
        }

        finalBooks.push({
            id: item.id || `static-${norm(item.title)}`, // ใช้ ID จริง หรือ Fallback
            title: item.title,
            image: { url: imageUrl }
        });
    });

    allBooksOriginal = finalBooks;
    renderBooksToSlides(finalBooks);
}

// ===============================
// 4. RENDER UI
// ===============================
function renderBooksToSlides(list) {
    const itemsPerPage = 10; 
    const totalSlides = Math.max(1, Math.ceil(list.length / itemsPerPage));
    totalSlidesCount = totalSlides; 

    totalCountDisplay.textContent = `(Found ${list.length} books)`;

    const container = document.getElementById("bookGridContainer");
    container.innerHTML = "";

    for (let slide = 0; slide < totalSlides; slide++) {
        const slideDiv = document.createElement("div");
        slideDiv.classList.add("genre-grid", "book-slide");
        slideDiv.dataset.slide = slide + 1;

        const pageBooks = list.slice(slide * itemsPerPage, slide * itemsPerPage + itemsPerPage);

        pageBooks.forEach(book => {
            const btn = document.createElement("button");
            btn.classList.add("genre-button");
            btn.setAttribute("data-book-id", book.id);
            btn.title = book.title; 

            // ใส่รูปภาพ
            const imgUrl = book.image?.url || `https://placehold.co/150x220/ccc/555?text=${encodeURIComponent(book.title.substring(0,10))}`;
            
            if (imgUrl.includes("no-image") || !imgUrl) {
                btn.style.backgroundImage = `url('https://placehold.co/150x220/333/FFF?text=${encodeURIComponent(book.title)}')`;
            } else {
                btn.style.backgroundImage = `url('${imgUrl}')`;
            }
            
            btn.style.backgroundSize = "cover";
            btn.style.backgroundPosition = "center";
            
            // Logic การเลือก
            const isSelected = selectedBooks.has(book.id);

            if (isSelected) btn.classList.add('selected');

            btn.addEventListener("click", () => {
                const val = book.id;
                
                if (selectedBooks.has(val)) {
                    selectedBooks.delete(val);
                    btn.classList.remove("selected");
                } else {
                    selectedBooks.add(val);
                    btn.classList.add("selected");
                }
                saveLocalBooks(); 
                updateCount();
            });

            slideDiv.appendChild(btn);
        });

        container.appendChild(slideDiv);
    }

    setupSlides();
    updateCount();
}

function setupSlides() {
    const slides = document.querySelectorAll('.book-slide');
    slides.forEach((slide, i) => {
        slide.style.display = i === 0 ? "grid" : "none";
    });
    currentSlide = 1;
    updatePaginationText(); 
    prevArrow.disabled = true;
    nextArrow.disabled = slides.length <= 1;
    prevArrow.style.opacity = 0.3;
    nextArrow.style.opacity = nextArrow.disabled ? 0.3 : 1;
}

function updatePaginationText() {
    pageIndicator.textContent = `Page ${currentSlide} of ${totalSlidesCount}`;
}

function navigateCarousel(direction) {
    const slides = document.querySelectorAll('.book-slide');
    const newSlide = currentSlide + direction;
    if (newSlide < 1 || newSlide > slides.length) return;

    document.querySelector(`.book-slide[data-slide="${currentSlide}"]`).style.display = "none";
    currentSlide = newSlide;
    document.querySelector(`.book-slide[data-slide="${currentSlide}"]`).style.display = "grid";
    updatePaginationText(); 

    prevArrow.disabled = currentSlide === 1;
    nextArrow.disabled = currentSlide === slides.length;
    prevArrow.style.opacity = prevArrow.disabled ? 0.3 : 1;
    nextArrow.style.opacity = nextArrow.disabled ? 0.3 : 1;
}

function updateCount() {
    statusSpan.textContent = `Selected: ${selectedBooks.size}`;
    finishBtn.disabled = selectedBooks.size < 3;
    finishBtn.style.opacity = finishBtn.disabled ? 0.6 : 1;
}

unselectAllBtn.addEventListener("click", () => {
    selectedBooks.clear();
    saveLocalBooks();
    document.querySelectorAll('.genre-button.selected').forEach(btn => btn.classList.remove('selected'));
    updateCount();
});

// ===============================
// SEARCH LOGIC
// ===============================
let searchTimeout = null;
searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        const keyword = searchInput.value.trim();
        if (!keyword) {
            renderBooksToSlides(allBooksOriginal); // กลับมาใช้ List 100 เล่ม
            return;
        }
        
        const books = await fetchBooks(keyword);
        if (!books || books.length === 0) {
            document.getElementById("bookGridContainer").innerHTML = "<div style='text-align:center; padding:20px; color:#888;'>No books found</div>";
            totalCountDisplay.textContent = "(Found 0 books)";
            pageIndicator.textContent = "Page 0 of 0";
            return;
        }
        renderBooksToSlides(books);
    }, 400);
});

// ===============================
// FINISH & SAVE
// ===============================
finishBtn.addEventListener("click", async () => {
    if (selectedBooks.size < 3) return;

    let selectedGenres = JSON.parse(localStorage.getItem("selectedGenres") || "[]");
    let selectedAuthors = JSON.parse(localStorage.getItem("selectedAuthors") || "[]");
    const mainPref = JSON.parse(localStorage.getItem("preference") || "{}");
    if (selectedGenres.length === 0 && mainPref.genres) selectedGenres = mainPref.genres;
    if (selectedAuthors.length === 0 && mainPref.authors) selectedAuthors = mainPref.authors;
    
    const token = localStorage.getItem("token");
    if (!token) { alert("Session expired"); window.location.href = "login.html"; return; }

    finishBtn.textContent = "Saving...";
    finishBtn.disabled = true;

    try {
        const res = await fetch("/api/preferences/save", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({
                preferred_genres: selectedGenres,
                preferred_authors: selectedAuthors,
                preferred_books: Array.from(selectedBooks)
            })
        });

        if (!res.ok) throw new Error("Server Error");
        
        selectionPage.style.display = "none";
        thankYouPage.style.display = "flex";
        localStorage.removeItem("preference");
        
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.addEventListener("click", () => window.location.href = "dashboard-page.html");
        }

    } catch (err) {
        console.error(err);
        alert("Failed to save");
        finishBtn.textContent = "Finish";
        finishBtn.disabled = false;
    }
});

// INIT
document.addEventListener("DOMContentLoaded", () => {
    selectionPage.style.display = "block";
    thankYouPage.style.display = "none";
    loadLocalBooks(); 
    loadBooks(); 
});