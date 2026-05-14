import { Link } from 'react-router-dom';
import '../styles/styles.css';

export default function LandingPage() {
  return (
    <div className="welcome-container">
      <div className="main-icon"></div>
      <div className="welcome-text">Welcome to Reading Journal</div>
      <div className="button-group">
        <Link to="/login" className="button secondary">Log In</Link>
        <Link to="/signup" className="button primary">Sign Up</Link>
      </div>
    </div>
  );
}
