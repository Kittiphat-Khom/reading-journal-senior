import { Link } from 'react-router-dom';
import '../styles/landing.css';

const BOOKS = [
  { cls: 'b1', title: 'Babel', by: 'R. F. Kuang', no: '01' },
  { cls: 'b2', title: <>Project<br/>Hail Mary</>, by: 'Andy Weir', no: '02' },
  { cls: 'b3', title: <>The<br/>Vanishing<br/>Half</>, by: 'Brit Bennett', no: '03' },
  { cls: 'b4', title: 'Pachinko', by: 'Min Jin Lee', no: '04' },
  { cls: 'b5', title: <>Klara<br/>&amp; the Sun</>, by: 'K. Ishiguro', no: '05' },
];

export default function LandingPage() {
  return (
    <div className="lp-page">

      {/* Nav */}
      <nav className="lp-nav">
        <a href="/" className="lp-brand">
          <span className="lp-logo">
            <svg viewBox="0 0 48 48" fill="none">
              <path d="M16 10h16a2 2 0 0 1 2 2v27l-10-5.5L14 39V12a2 2 0 0 1 2-2z" fill="#fff"/>
              <path d="m24 17 1.7 3.5 3.85.55-2.78 2.7.66 3.83L24 25.78l-3.43 1.8.66-3.82-2.78-2.71 3.85-.55L24 17z" fill="#162d43"/>
            </svg>
          </span>
          <span className="lp-nm">Reading Journal<small>est. 2024 · v2</small></span>
        </a>
        <div className="lp-navlinks">
          <Link to="/login" className="lp-navlink lp-login">Enter</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-copy">
          <h1 className="lp-h1">
            Your shelf, <em>quietly</em> kept.<span className="lp-line2">Your reading, <em>remembered</em>.</span>
          </h1>

          <p className="lp-lede">
            Log every book, save the lines that stay with you, and pick up where you left off — a calm corner of the internet, made for the people who still read closely.
          </p>

          <div className="lp-ctas">
            <Link to="/login" className="lp-btn lp-btn-primary">
              Begin your journal
              <span className="lp-arrow"></span>
            </Link>
            <Link to="/signup" className="lp-btn lp-btn-ghost">Create account</Link>
          </div>

        </div>

        {/* Visual */}
        <div className="lp-visual" aria-hidden="true">
          <div className="lp-monogram">R</div>

          {BOOKS.map(({ cls, title, by, no }) => (
            <div key={cls} className={`lp-book ${cls}`}>
              <div className="lp-topdec"><span className="lp-gline"></span><span className="lp-dot"></span></div>
              <div className="lp-bt">{title}</div>
              <div className="lp-byline">{by}</div>
              <div className="lp-num-tag">No. {no}</div>
            </div>
          ))}

        </div>
      </section>

      {/* Footer features */}
      <section className="lp-footrow">
        <div className="lp-footrow-inner">
          {[
            { n: '01', title: 'Keep a shelf', desc: 'Log every book. Track your progress, in your own time.' },
            { n: '02', title: 'Save the lines', desc: 'Highlight passages worth re-reading. They live with the book.' },
            { n: '03', title: 'Quiet reviews', desc: 'A sentence, a paragraph, or a page — written for you first.' },
            { n: '04', title: 'Considered picks', desc: 'Recommendations from what you actually finished and loved.' },
          ].map(({ n, title, desc }) => (
            <div key={n} className="lp-feat">
              <span className="lp-feat-n">No. {n}</span>
              <b>{title}</b>
              <span>{desc}</span>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
