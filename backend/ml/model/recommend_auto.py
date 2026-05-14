import pickle, json, sys, pandas as pd, os
import numpy as np
import difflib 
import random

# 🔥 บังคับ Output UTF-8 (สำคัญมากสำหรับ Windows/Node.js)
sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")

# ==========================================
# ⚙️ HYPERPARAMETERS & CONFIGURATION
# ==========================================

# 1. Feature Weights (ตาม Survey)
W_GENRE = 0.38       # ความสำคัญอันดับ 1
W_CONTENT = 0.32     # ความสำคัญอันดับ 2
W_AUTHOR = 0.30      # ความสำคัญอันดับ 3

# 2. Search Bonus
SEARCH_BOOST = 0.2   

# 3. Diversity Limits
MAX_BOOKS_PER_AUTHOR = 3   
MAX_TOTAL_RESULTS = 100    # ✅ แก้ไข: จำกัดจำนวนผลลัพธ์สูงสุดแค่ 100 เล่ม

# ==========================================
# 🔧 Helper Functions
# ==========================================
def normalize_text(text):
    if not isinstance(text, str): return ""
    text = text.lower()
    for char in ['-', '_', ' ', '.', ',']: 
        text = text.replace(char, '')
    return text.strip()

def get_jaccard_sim(user_genres, book_genres):
    s_user = set(user_genres)
    s_book = set(book_genres)
    if not s_user or not s_book: return 0.0
    intersection = len(s_user.intersection(s_book))
    return intersection / len(s_user)

def score_to_tier(raw_score):
    """แปลง raw score เป็น tier label + honest percentage."""
    pct = int(round(raw_score * 100))
    if raw_score >= 0.60:   tier = "Excellent Match"
    elif raw_score >= 0.40: tier = "Strong Match"
    elif raw_score >= 0.25: tier = "Good Match"
    elif raw_score >= 0.10: tier = "Possible Match"
    else:                   tier = "Popular Pick"
    return pct, tier

def get_fallback_books(n=15):
    try:
        idx_path = os.path.join(MODEL_DIR, "book_index.pkl")
        if os.path.exists(idx_path):
            df = pd.read_pickle(idx_path)
            # Filter: must have author and image
            df_valid = df[
                df['authors'].notna() & (df['authors'] != '') & (df['authors'] != 'Unknown') &
                df['image_url'].notna() & (df['image_url'] != '')
            ]
            sample = df_valid.sample(n=min(n, len(df_valid)))
            results = []
            for _, row in sample.iterrows():
                results.append({
                    "id": str(row['book_id']),
                    "title": str(row['title']),
                    "image": str(row['image_url']),
                    "author": str(row['authors']),
                    "genre": str(row['genres']).replace('|', '/'),
                    "description": str(row['description']) if 'description' in row else "",
                    "score": 0.0,
                    "match_percent": "Popular",
                    "tier": "Popular Pick",
                    "reason": "Browse our library",
                    "rating": round(float(row['rating']), 2) if 'rating' in row and row['rating'] else 3.5
                })
            return results
    except: pass
    return []

# ==========================================
# 🧠 Main Logic
# ==========================================
if __name__ == "__main__":
    try:
        # ---------------------------------------------------------
        # 1. Load Data & Models
        # ---------------------------------------------------------
        idx_path = os.path.join(MODEL_DIR, "book_index.pkl")
        sim_path = os.path.join(MODEL_DIR, "cosine_sim.pkl")
        
        if not os.path.exists(idx_path) or not os.path.exists(sim_path):
            print(json.dumps(get_fallback_books(), ensure_ascii=False)); sys.exit(0)

        df = pd.read_pickle(idx_path)
        cosine_sim = pickle.load(open(sim_path, "rb"))

        # ---------------------------------------------------------
        # 2. Parse User Input
        # ---------------------------------------------------------
        try:
            input_data = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
        except: input_data = {}

        liked_ids = input_data.get("books", [])
        searches = input_data.get("searches", [])
        raw_authors = input_data.get("authors", [])
        raw_genres = input_data.get("genres", [])
        
        # Normalize Input
        user_authors = set(normalize_text(a) for a in raw_authors)
        user_genres = set(normalize_text(g) for g in raw_genres)

        # Lookup Dictionaries
        id_to_idx = {str(row['book_id']): i for i, row in df.iterrows()}
        title_to_idx = {normalize_text(str(row['title'])): i for i, row in df.iterrows()}
        all_titles = df['title'].tolist()

        # Pre-process
        df['clean_authors'] = df['authors'].apply(normalize_text)
        df['clean_genres_list'] = df['genres'].apply(lambda x: set(normalize_text(g) for g in str(x).split('|')))

        final_scores = np.zeros(len(df))
        reasons = [""] * len(df)

        # ---------------------------------------------------------
        # 📊 PART 1: CALCULATE SCORES
        # ---------------------------------------------------------
        
        # A. History Profile Vector
        user_profile_vector = None
        if liked_ids:
            valid_vecs = []
            matched_titles = []
            all_titles_normalized = [(normalize_text(t), t) for t in all_titles]

            for item in liked_ids:
                query = str(item).strip()
                idx = id_to_idx.get(query)

                # exact normalized match
                if idx is None:
                    idx = title_to_idx.get(normalize_text(query))

                # fuzzy match — cutoff 0.6: เข้มพอไม่ให้ผิด แต่รับ edition/subtitle ต่างกันได้
                if idx is None:
                    matches = difflib.get_close_matches(normalize_text(query),
                                                        [n for n, _ in all_titles_normalized],
                                                        n=1, cutoff=0.6)
                    if matches:
                        idx = title_to_idx.get(matches[0])

                if idx is not None:
                    valid_vecs.append(cosine_sim[idx])
                    matched_titles.append(df.iloc[idx]['title'])
                else:
                    print(f"[Profile] no match for: {query}", file=sys.stderr)

            print(f"[Profile] matched {len(valid_vecs)}/{len(liked_ids)}: {matched_titles}", file=sys.stderr)

            if valid_vecs:
                user_profile_vector = np.mean(valid_vecs, axis=0)

        # B. Loop Scoring per Book
        for i, row in df.iterrows():
            # --- 1. Author Score (Priority สูงสุด) ---
            score_author = 0.0
            if any(ua in row['clean_authors'] for ua in user_authors) or row['clean_authors'] in user_authors:
                score_author = 1.0
                reasons[i] = f"From author {row['authors']}"
            
            # --- 2. Genre Score (Priority 2: พระเอกหลัก) ---
            score_genre = get_jaccard_sim(user_genres, row['clean_genres_list'])
            
            # 🔥 Logic Update: ถ้าหมวดหมู่ตรงเกิน 50% ให้ยึดเหตุผลนี้เป็นหลัก (Genre มาก่อน)
            if score_genre >= 0.5 and reasons[i] == "": 
                reasons[i] = "Matches your genres"

            # --- 3. Content Score (Priority 3: ตัวเสริม) ---
            score_content = 0.0
            if user_profile_vector is not None:
                score_content = user_profile_vector[i]
                
                # 🔥 Logic Update: จะโชว์ Similar ก็ต่อเมื่อ...
                # 1. ยังไม่มีเหตุผล (แปลว่า Author ก็ไม่ใช่, Genre ก็ไม่ถึง 50%)
                # 2. แต่เนื้อหาดันคล้าย (Content Score > 0.3)
                if reasons[i] == "" and score_content > 0.3:
                    reasons[i] = "Similar to books you liked"
            
            # กรณีกันเหนียว: ถ้าหลุดมาทุกด่านแล้วยังไม่มีเหตุผล แต่คะแนน Genre มีบ้าง
            if reasons[i] == "" and score_genre > 0:
                 reasons[i] = "Matches your genres"

            # Combine Scores
            total = (score_author * W_AUTHOR) + \
                    (score_content * W_CONTENT) + \
                    (score_genre * W_GENRE)
            
            final_scores[i] = total

        # ---------------------------------------------------------
        # 🔍 PART 2: SEARCH BOOSTING
        # ---------------------------------------------------------
        if searches:
            for query in searches:
                if len(query) < 3: continue
                matches = difflib.get_close_matches(query, all_titles, n=1, cutoff=0.4)
                if matches:
                    matched_title = matches[0]
                    matched_row = df[df['title'] == matched_title].iloc[0]
                    idx = id_to_idx.get(str(matched_row['book_id']))
                    
                    if idx is not None:
                        sim_scores = cosine_sim[idx]
                        final_scores += (sim_scores * SEARCH_BOOST)
                        
                        top_sim = sim_scores.argsort()[::-1][:5]
                        for s_idx in top_sim:
                            if final_scores[s_idx] > 0.5:
                                reasons[s_idx] = f"Related to search '{query}'"

        # ---------------------------------------------------------
        # 🚀 PART 3: RANKING & OUTPUT
        # ---------------------------------------------------------
        df['final_total'] = final_scores
        df['final_reason'] = reasons
        
        # 🔥 Filter: ใช้ 0.01 เพื่อให้แสดงผลเยอะๆ (Unlimited) 
        # ยอมรับว่าคะแนนต่ำกว่า 50% จะติดมาด้วย (แต่จะอยู่ท้ายๆ)
        # Filter: score threshold + must have author and image
        candidates = df[
            (df['final_total'] >= 0.04) &
            df['authors'].notna() & (df['authors'] != '') & (df['authors'] != 'Unknown') &
            df['image_url'].notna() & (df['image_url'] != '')
        ].sort_values(by='final_total', ascending=False)

        if candidates.empty:
            print(json.dumps(get_fallback_books(), ensure_ascii=False)); sys.exit(0)

        final_recommendations = []
        author_counts = {}

        # Apply Quota
        for _, row in candidates.iterrows():
            if len(final_recommendations) >= MAX_TOTAL_RESULTS:
                break

            auth = row['authors']
            current_count = author_counts.get(auth, 0)

            if current_count < MAX_BOOKS_PER_AUTHOR:
                final_recommendations.append(row)
                author_counts[auth] = current_count + 1

        results = []
        for row in final_recommendations:
            raw_score = float(row['final_total'])
            pct, tier = score_to_tier(raw_score)

            results.append({
                "id": str(row['book_id']),
                "title": row['title'],
                "image": str(row['image_url']),
                "author": str(row['authors']),
                "genre": str(row['genres']).replace('|', '/'),
                "description": str(row['description']) if 'description' in row else "No description available.",
                "score": round(raw_score, 3),
                "match_percent": f"{pct}%",
                "tier": tier,
                "reason": row['final_reason'],
                "rating": round(float(row['rating']), 2) if 'rating' in row and row['rating'] else 3.5
            })

        # Fill with fallback if needed
        if len(results) < 5:
            fillers = get_fallback_books(15 - len(results))
            results.extend(fillers)

        print(json.dumps(results, ensure_ascii=False))

    except Exception as e:
        print(json.dumps(get_fallback_books(), ensure_ascii=False))