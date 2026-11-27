// Das eigene Fahrer-Foto als Bildadresse (nur auf diesem Gerät, siehe daten/gesicht.ts).
import { useEffect, useState } from 'preact/hooks';
import { leseGesicht } from '../../daten/gesicht';
import { useLive } from '../hooks';

export function useGesicht(): string | null {
  const blob = useLive(leseGesicht, [], null as Blob | null);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) return setUrl(null);
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}
