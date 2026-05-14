export default function Pagination({ page, totalPages, onPrev, onNext }) {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination-wrapper">
      <button className="page-nav-btn" onClick={onPrev} disabled={page === 1}>
        <i className="fa-solid fa-chevron-left"></i>
      </button>
      <span>Page {page} of {totalPages}</span>
      <button className="page-nav-btn" onClick={onNext} disabled={page === totalPages}>
        <i className="fa-solid fa-chevron-right"></i>
      </button>
    </div>
  );
}
