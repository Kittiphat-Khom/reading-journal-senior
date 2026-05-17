import json, sys, os
import numpy as np
import difflib
from sklearn.metrics.pairwise import cosine_similarity

import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")

# ==========================================
# HYPERPARAMETERS
# ==========================================
W_GENRE = 0.38
W_CONTENT = 0.32
W_AUTHOR = 0.30

SEARCH_BOOST = 0.2

MAX_BOOKS_PER_AUTHOR = 3
MAX_TOTAL_RESULTS = 100

# ==========================================
# Helper Functions
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
    return len(s_user.intersection(s_book)) / len(s_user)

def score_to_tier(raw_score):
    pct = int(round(raw_score * 100))
    if raw_score >= 0.60:   tier = "Excellent Match"
    elif raw_score >= 0.40: tier = "Strong Match"
    elif raw_score >= 0.25: tier = "Good Match"
    elif raw_score >= 0.10: tier = "Possible Match"
    else:                   tier = "Popular Pick"
    return pct, tier

def get_fallback_books(n=15):
    try:
        idx_path = os.path.join(MODEL_DIR, "book_index.csv")
        if os.path.exists(idx_path):
            df = pd.read_csv(idx_path)
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
                    "rating": round(float(row['rating']), 2) if pd.notna(row.get('rating')) and row.get('rating') else 3.5
                })
            return results
    except: pass
    return []

# ==========================================
# Main Logic
# ==========================================
if __name__ == "__main__":
    try:
        # ---------------------------------------------------------
        # 1. Load Data & Models
        # ---------------------------------------------------------
        idx_path = os.path.join(MODEL_DIR, "book_index.csv")
        emb_path = os.path.join(MODEL_DIR, "embeddings.npy")

        if not os.path.exists(idx_path) or not os.path.exists(emb_path):
            print(json.dumps(get_fallback_books(), ensure_ascii=False)); sys.exit(0)

        df = pd.read_csv(idx_path)
        embeddings = np.load(emb_path)

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

        id_to_idx = {str(row['book_id']): i for i, row in df.iterrows()}
        title_to_idx = {normalize_text(str(row['title'])): i for i, row in df.iterrows()}
        all_titles = df['title'].tolist()

        df['clean_authors'] = df['authors'].apply(normalize_text)
        df['clean_genres_list'] = df['genres'].apply(lambda x: set(normalize_text(g) for g in str(x).split('|')))

        final_scores = np.zeros(len(df))
        reasons = [""] * len(df)

        # ---------------------------------------------------------
        # PART 1: CALCULATE SCORES
        # ---------------------------------------------------------

        # A. Build user profile vector from liked books, compute content scores
        content_scores = np.zeros(len(df))
        if liked_ids:
            valid_embs = []
            matched_titles = []
            all_titles_normalized = [(normalize_text(t), t) for t in all_titles]

            for item in liked_ids:
                query = str(item).strip()
                idx = id_to_idx.get(query)

                if idx is None:
                    idx = title_to_idx.get(normalize_text(query))

                if idx is None:
                    matches = difflib.get_close_matches(normalize_text(query),
                                                        [n for n, _ in all_titles_normalized],
                                                        n=1, cutoff=0.6)
                    if matches:
                        idx = title_to_idx.get(matches[0])

                if idx is not None:
                    valid_embs.append(embeddings[idx])
                    matched_titles.append(df.iloc[idx]['title'])
                else:
                    print(f"[Profile] no match for: {query}", file=sys.stderr)

            print(f"[Profile] matched {len(valid_embs)}/{len(liked_ids)}: {matched_titles}", file=sys.stderr)

            if valid_embs:
                user_profile_vector = np.mean(valid_embs, axis=0)
                content_scores = cosine_similarity([user_profile_vector], embeddings)[0]

        # B. Loop Scoring per Book
        for i, row in df.iterrows():
            score_author = 0.0
            if any(ua in row['clean_authors'] for ua in user_authors) or row['clean_authors'] in user_authors:
                score_author = 1.0
                reasons[i] = f"From author {row['authors']}"

            score_genre = get_jaccard_sim(user_genres, row['clean_genres_list'])

            if score_genre >= 0.5 and reasons[i] == "":
                reasons[i] = "Matches your genres"

            score_content = content_scores[i]

            if reasons[i] == "" and score_content > 0.3:
                reasons[i] = "Similar to books you liked"

            if reasons[i] == "" and score_genre > 0:
                reasons[i] = "Matches your genres"

            total = (score_author * W_AUTHOR) + \
                    (score_content * W_CONTENT) + \
                    (score_genre * W_GENRE)

            final_scores[i] = total

        # ---------------------------------------------------------
        # PART 2: SEARCH BOOSTING
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
                        sim_scores = cosine_similarity([embeddings[idx]], embeddings)[0]
                        final_scores += (sim_scores * SEARCH_BOOST)

                        top_sim = sim_scores.argsort()[::-1][:5]
                        for s_idx in top_sim:
                            if final_scores[s_idx] > 0.5:
                                reasons[s_idx] = f"Related to search '{query}'"

        # ---------------------------------------------------------
        # PART 3: RANKING & OUTPUT
        # ---------------------------------------------------------
        df['final_total'] = final_scores
        df['final_reason'] = reasons

        candidates = df[
            (df['final_total'] >= 0.04) &
            df['authors'].notna() & (df['authors'] != '') & (df['authors'] != 'Unknown') &
            df['image_url'].notna() & (df['image_url'] != '')
        ].sort_values(by='final_total', ascending=False)

        if candidates.empty:
            print(json.dumps(get_fallback_books(), ensure_ascii=False)); sys.exit(0)

        final_recommendations = []
        author_counts = {}

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
                "rating": round(float(row['rating']), 2) if pd.notna(row.get('rating')) and row.get('rating') else 3.5
            })

        if len(results) < 5:
            fillers = get_fallback_books(15 - len(results))
            results.extend(fillers)

        print(json.dumps(results, ensure_ascii=False))

    except Exception as e:
        print(f"[RECOMMEND ERROR] {type(e).__name__}: {e}", file=sys.stderr)
        import traceback; traceback.print_exc(file=sys.stderr)
        print(json.dumps(get_fallback_books(), ensure_ascii=False))
