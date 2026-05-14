-- Reading Journal — Full Database Schema
-- Run this on Railway MySQL to recreate all tables

SET FOREIGN_KEY_CHECKS = 0;

-- 1. User
CREATE TABLE IF NOT EXISTS User (
  user_id            INT AUTO_INCREMENT PRIMARY KEY,
  username           VARCHAR(100) NOT NULL UNIQUE,
  email              VARCHAR(150) NOT NULL UNIQUE,
  pwd                VARCHAR(255) NOT NULL,
  role               ENUM('user', 'admin') DEFAULT 'user',
  is_verified        TINYINT(1) DEFAULT 0,
  verification_token VARCHAR(255) DEFAULT NULL,
  reset_token        VARCHAR(255) DEFAULT NULL,
  reset_token_expire DATETIME DEFAULT NULL,
  register_date      DATETIME DEFAULT NOW()
);

-- 2. In_active_user (soft-deleted users archive)
CREATE TABLE IF NOT EXISTS In_active_user (
  user_id       INT,
  username      VARCHAR(100),
  email         VARCHAR(150),
  pwd           VARCHAR(255),
  register_date DATETIME,
  deleted_at    DATETIME DEFAULT NOW()
);

-- 3. MPC (user preferences)
CREATE TABLE IF NOT EXISTS MPC (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  user_id           INT NOT NULL UNIQUE,
  preferred_genres  JSON,
  preferred_authors JSON,
  preferred_books   JSON,
  FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE
);

-- 4. Journal
CREATE TABLE IF NOT EXISTS Journal (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  user_id            INT NOT NULL,
  title              VARCHAR(255),
  author             VARCHAR(255),
  genre              VARCHAR(255),
  startdate          DATE,
  enddate            DATE,
  review             TEXT,
  total_reading_time TIME DEFAULT '00:00:00',
  star_point         TINYINT DEFAULT 0,
  spicy_point        TINYINT DEFAULT 0,
  drama_point        TINYINT DEFAULT 0,
  book_image         LONGTEXT,
  platform           VARCHAR(50),
  reading_log        JSON,
  FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE
);

-- 5. journal_chapters
CREATE TABLE IF NOT EXISTS journal_chapters (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  journal_id     INT NOT NULL,
  chapter_number INT,
  review         TEXT,
  star_point     TINYINT DEFAULT 0,
  drama_point    TINYINT DEFAULT 0,
  spicy_point    TINYINT DEFAULT 0,
  FOREIGN KEY (journal_id) REFERENCES Journal(id) ON DELETE CASCADE
);

-- 6. chapter_quotes
CREATE TABLE IF NOT EXISTS chapter_quotes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  chapter_id INT NOT NULL,
  quote_text TEXT,
  created_at DATETIME DEFAULT NOW(),
  FOREIGN KEY (chapter_id) REFERENCES journal_chapters(id) ON DELETE CASCADE
);

-- 7. chapter_annotations
CREATE TABLE IF NOT EXISTS chapter_annotations (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  chapter_id INT NOT NULL,
  note_text  TEXT,
  created_at DATETIME DEFAULT NOW(),
  FOREIGN KEY (chapter_id) REFERENCES journal_chapters(id) ON DELETE CASCADE
);

-- 8. chapter_favorite_pages
CREATE TABLE IF NOT EXISTS chapter_favorite_pages (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  chapter_id  INT NOT NULL,
  page_number INT,
  FOREIGN KEY (chapter_id) REFERENCES journal_chapters(id) ON DELETE CASCADE
);

-- 9. FAVORITE
CREATE TABLE IF NOT EXISTS FAVORITE (
  favor_id    INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  title       VARCHAR(255),
  author      VARCHAR(255),
  genre       VARCHAR(100),
  book_image  TEXT,
  description TEXT,
  FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE
);

-- 10. Report
CREATE TABLE IF NOT EXISTS Report (
  report_id       INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  title           VARCHAR(255),
  description     TEXT,
  report_image    LONGTEXT,
  is_done         TINYINT(1) DEFAULT 0,
  management_note TEXT,
  managed_by      VARCHAR(100) DEFAULT NULL,
  managed_at      DATETIME DEFAULT NULL,
  created_at      DATETIME DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE
);

-- 11. search_logs
CREATE TABLE IF NOT EXISTS search_logs (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT NOT NULL,
  search_query     VARCHAR(255),
  search_timestamp DATETIME DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE
);

SET FOREIGN_KEY_CHECKS = 1;
