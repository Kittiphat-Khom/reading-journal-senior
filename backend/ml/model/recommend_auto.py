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
# Theory: Linear Combination of Normalized Features
# Reference: Burke, R. (2002). Hybrid recommender systems.
# ==========================================

# 1. Feature Weights (Sum must equal 1.0)
# ปรับจูนตาม Feature Importance: ชื่อนักเขียนมีผลต่อการตัดสินใจสูงสุด
W_AUTHOR = 0.30      # Feature รอง: ถ้าผู้แต่งตรงก็ได้โบนัส (30%)
W_CONTENT = 0.50     # Feature หลัก: เนื้อหาคล้ายกันสำคัญที่สุด (50%)
W_GENRE = 0.20     # Weak Feature / Broad Category (10%)

# 2. Search Bonus
SEARCH_BOOST = 0.2   # คะแนนพิเศษเมื่อคำค้นหาตรงกับชื่อเรื่อง

# 3. Diversity Limits
MAX_BOOKS_PER_AUTHOR = 5   # Quota: ห้ามผู้แต่งคนเดิมซ้ำเกิน 5 เล่ม
MAX_TOTAL_RESULTS = 70     # แสดงผลสูงสุด 70 เล่ม

# ==========================================
# 🔧 Helper Functions
# ==========================================
def normalize_text(text):
    if not isinstance(text, str): return ""
    return text.replace('-', ' ').replace('_', ' ').strip().lower()

def get_jaccard_sim(list1, list2):
    """คำนวณความเหมือนของหมวดหมู่ (Jaccard Index)"""
    s1 = set(list1)
    s2 = set(list2)
    if not s1 or not s2: return 0.0
    return len(s1.intersection(s2)) / len(s1.union(s2))

def get_fallback_books(n=15):
    """กรณีฉุกเฉิน: คืนค่าหนังสือสุ่ม"""
    try:
        idx_path = os.path.join(MODEL_DIR, "book_index.pkl")
        if os.path.exists(idx_path):
            df = pd.read_pickle(idx_path)
            sample = df.sample(n=min(n, len(df)))
            results = []
            for _, row in sample.iterrows():
                results.append({
                    "id": str(row['book_id']),
                    "title": str(row['title']),
                    "image_url": str(row['image_url']),
                    "authors": str(row['authors']),
                    "genres": str(row['genres']),
                    "description": str(row['description']) if 'description' in row else "No description available.",
                    "score": 0.85,
                    "match_percent": "85%",
                    "reason": "Popular Recommendation"
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
        
        user_authors = set(normalize_text(a) for a in raw_authors)
        user_genres = set(normalize_text(g) for g in raw_genres)

        final_scores = np.zeros(len(df))
        reasons = [""] * len(df)
        id_to_idx = {str(row['book_id']): i for i, row in df.iterrows()}
        all_titles = df['title'].tolist()

        # Pre-process lists for faster Jaccard calculation
        df['clean_authors'] = df['authors'].apply(normalize_text)
        df['clean_genres_list'] = df['genres'].apply(lambda x: set(normalize_text(g) for g in str(x).split('|')))

        # ---------------------------------------------------------
        # 📊 PART 1: CALCULATE SCORES (Linear Combination)
        # ---------------------------------------------------------
        
        # A. History Profile Vector (Book-to-Book Similarity Base)
        # หา "ค่าเฉลี่ย" ของ Vector หนังสือที่ User ชอบ
        user_profile_vector = None
        if liked_ids:
            valid_vecs = []
            for bid in liked_ids:
                idx = id_to_idx.get(str(bid))
                if idx is not None:
                    valid_vecs.append(cosine_sim[idx])
            
            if valid_vecs:
                user_profile_vector = np.mean(valid_vecs, axis=0)

        # B. Loop Scoring per Book
        for i, row in df.iterrows():
            # Factor 1: Author Similarity (Binary) -> Weight 0.65
            score_author = 0.0
            if row['clean_authors'] in user_authors:
                score_author = 1.0
                if reasons[i] == "": reasons[i] = f"From author {row['authors']}"
            
            # Factor 2: Genre Similarity (Jaccard) -> Weight 0.10
            score_genre = get_jaccard_sim(user_genres, row['clean_genres_list'])
            if score_genre > 0 and reasons[i] == "": reasons[i] = "Matches your genres"

            # Factor 3: Content/Book Similarity (Cosine) -> Weight 0.25
            score_content = 0.0
            if user_profile_vector is not None:
                score_content = user_profile_vector[i] 
            
            # 🔥 FINAL FORMULA: Weighted Sum
            total = (score_author * W_AUTHOR) + \
                    (score_content * W_CONTENT) + \
                    (score_genre * W_GENRE)
            
            final_scores[i] = total

        # ---------------------------------------------------------
        # 🔍 PART 2: SEARCH BOOSTING (Additive)
        # ---------------------------------------------------------
        if searches:
            for query in searches:
                if len(query) < 3: continue
                # Fuzzy Match Title
                matches = difflib.get_close_matches(query, all_titles, n=1, cutoff=0.4)
                if not matches:
                    mask = df['title'].str.contains(query, case=False, na=False)
                    if mask.any(): matches = df.loc[mask, 'title'].head(1).tolist()

                if matches:
                    matched_title = matches[0]
                    matched_row = df[df['title'] == matched_title].iloc[0]
                    idx = id_to_idx.get(str(matched_row['book_id']))
                    
                    if idx is not None:
                        sim_scores = cosine_sim[idx]
                        # Boost Score
                        final_scores += (sim_scores * SEARCH_BOOST)
                        
                        top_sim = sim_scores.argsort()[::-1][:5]
                        for s_idx in top_sim:
                            # Update reason only if it boosts significantly
                            if final_scores[s_idx] > 0.4:
                                reasons[s_idx] = f"Related to search '{query}'"

        # ---------------------------------------------------------
        # 🚀 PART 3: RANKING & DIVERSITY FILTER (Quota System)
        # ---------------------------------------------------------
        df['final_total'] = final_scores
        df['final_reason'] = reasons
        
        # 1. Sort Descending by Score
        candidates = df[df['final_total'] > 0.01].sort_values(by='final_total', ascending=False)
        
        if candidates.empty:
            print(json.dumps(get_fallback_books(), ensure_ascii=False)); sys.exit(0)

        final_recommendations = []
        author_counts = {}

        # 2. Apply Quota Limit
        for _, row in candidates.iterrows():
            if len(final_recommendations) >= MAX_TOTAL_RESULTS: break
            
            auth = row['authors']
            current_count = author_counts.get(auth, 0)
            
            # Check Diversity Rule
            if current_count < MAX_BOOKS_PER_AUTHOR:
                final_recommendations.append(row)
                author_counts[auth] = current_count + 1

        # ---------------------------------------------------------
        # 4. Output Formatting
        # ---------------------------------------------------------
        results = []
        for row in final_recommendations:
            raw_score = row['final_total']
            
            # Cap score at 0.99 for display
            if raw_score > 0.99: raw_score = 0.99
            
            display_percent = int(raw_score * 100)

            results.append({
                "id": str(row['book_id']),
                "title": row['title'],
                "image_url": row['image_url'],
                "authors": row['authors'],
                "genres": row['genres'],
                "description": str(row['description']) if 'description' in row else "No description available.",
                "score": round(raw_score, 3),
                "match_percent": f"{display_percent}%",
                "reason": row['final_reason']
            })

        # Fill with popular books if results are too few
        if len(results) < 10:
            fillers = get_fallback_books(15 - len(results))
            results.extend(fillers)

        print(json.dumps(results, ensure_ascii=False))

    except Exception as e:
        # Fallback mechanism
        print(json.dumps(get_fallback_books(), ensure_ascii=False))