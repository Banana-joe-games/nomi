import { useEffect, useState } from 'react';
import { BoothConfigurator } from './BoothConfigurator';
import { FrameExtractor } from './components/FrameExtractor';

function getRoute(): string {
  return window.location.hash.replace(/^#\/?/, '');
}

export default function App() {
  const [route, setRoute] = useState(getRoute());

  useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (route === 'booth') return <BoothConfigurator />;
  return <FrameExtractor />;
}
