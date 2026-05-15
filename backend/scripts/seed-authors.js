import db from '../db.js';

const AUTHORS = [
  "Han Kang", "Jon Fosse", "Samantha Harvey", "Percival Everett", "Sally Rooney",
  "Haruki Murakami", "Rebecca Yarros", "Sarah J. Maas", "Brandon Sanderson", "Emily Henry",
  "Colleen Hoover", "Freida McFadden", "R.F. Kuang", "Kristin Hannah", "James Clear",
  "Morgan Housel", "Toshikazu Kawaguchi", "Matt Haig", "Walter Isaacson", "Salman Rushdie",
  "David Nicholls", "Leigh Bardugo", "Holly Jackson", "Taylor Jenkins Reid", "Bonnie Garmus",
  "Gabrielle Zevin", "V.E. Schwab", "Olivie Blake", "Hernan Diaz", "Abraham Verghese",
  "J.K. Rowling", "Stephen King", "George R.R. Martin", "Neil Gaiman", "Margaret Atwood",
  "Kazuo Ishiguro", "Paulo Coelho", "Dan Brown", "John Grisham", "James Patterson",
  "Danielle Steel", "Nora Roberts", "Ken Follett", "Cormac McCarthy", "Toni Morrison",
  "Gabriel García Márquez", "Milan Kundera", "Orhan Pamuk", "Yuval Noah Harari", "Khaled Hosseini",
  "Alice Walker", "Donna Tartt", "Hanya Yanagihara", "Malcolm Gladwell", "Rick Riordan",
  "Michael Connelly", "David Baldacci", "Nicholas Sparks", "Gillian Flynn", "Elena Ferrante",
  "William Shakespeare", "Jane Austen", "Charles Dickens", "Leo Tolstoy", "Fyodor Dostoevsky",
  "George Orwell", "Mark Twain", "Ernest Hemingway", "F. Scott Fitzgerald", "Virginia Woolf",
  "Franz Kafka", "Victor Hugo", "Alexandre Dumas", "Charlotte Brontë", "Emily Brontë",
  "Oscar Wilde", "James Joyce", "Homer", "Dante Alighieri", "Miguel de Cervantes",
  "Albert Camus", "Vladimir Nabokov", "John Steinbeck", "J.D. Salinger", "Marcel Proust",
  "J.R.R. Tolkien", "Agatha Christie", "Arthur Conan Doyle", "C.S. Lewis", "Frank Herbert",
  "Isaac Asimov", "Arthur C. Clarke", "H.P. Lovecraft", "Edgar Allan Poe", "Roald Dahl",
  "Dr. Seuss", "Ursula K. Le Guin", "Terry Pratchett", "H.G. Wells", "Jules Verne",
];

await db.query(`CREATE TABLE IF NOT EXISTS admin_featured_authors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  author_id VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

let inserted = 0;
for (const name of AUTHORS) {
  const author_id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const [res] = await db.query(
    'INSERT IGNORE INTO admin_featured_authors (author_id, name) VALUES (?, ?)',
    [author_id, name]
  );
  if (res.affectedRows > 0) inserted++;
}

console.log(`Seeded ${inserted} authors (${AUTHORS.length - inserted} already existed)`);
process.exit(0);
