export default function SearchBookCard({ book, onClick }) {
  const cover = book.cover || book.image || book.book_image || '';
  return (
    <div className="book-card" onClick={onClick}>
      <div
        className="card-cover"
        style={{ backgroundImage: `url('${cover}')` }}
      />
      <div className="card-info">
        <div className="card-title" title={book.title}>{book.title}</div>
        <div className="card-author">{book.author || 'Unknown Author'}</div>
      </div>
    </div>
  );
}
