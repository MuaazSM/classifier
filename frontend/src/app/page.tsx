'use client';

import { useRouter } from 'next/navigation';
import LandingPage from '../components/LandingPage';

export default function Home() {
  const router = useRouter();

  const handleEnter = () => {
    // Navigate to the new departments page
    router.push('/departments');
  };

  return <LandingPage onEnter={handleEnter} />;
}