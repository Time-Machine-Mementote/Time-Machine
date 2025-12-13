// Dev Portal Page - Protected route that requires unlock
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DevPortal } from '@/components/DevPortal';
import { isDevUnlocked } from '@/utils/devPortalUnlock';
import { useAuth } from '@/contexts/AuthContext';

export function DevPortalPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // Check if dev portal is unlocked
    if (!isDevUnlocked()) {
      // Redirect to homepage if not unlocked
      navigate('/', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Location denied - continue without it
        }
      );
    }
  }, []);

  // Don't render if not unlocked (will redirect)
  if (!isDevUnlocked()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black">
      <DevPortal
        isOpen={true}
        onClose={() => navigate('/')}
        userLocation={location}
        userId={user?.id}
      />
    </div>
  );
}

