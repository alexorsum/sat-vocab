import { Link } from 'react-router-dom';
import { useTitle } from '../lib/hooks';

export default function NotFound() {
  useTitle('Page not found');
  return (
    <>
      <h1>Page not found</h1>
      <p>
        That page does not exist. <Link to="/">Go to Home</Link>
      </p>
    </>
  );
}
