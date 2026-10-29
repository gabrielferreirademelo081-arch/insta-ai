import { useEffect, useState } from 'react';

export function Toast() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let t: number | undefined;
    const h = (e: Event) => {
      setMsg((e as CustomEvent<string>).detail);
      window.clearTimeout(t);
      t = window.setTimeout(() => setMsg(null), 3500);
    };
    window.addEventListener('app-toast', h);
    return () => window.removeEventListener('app-toast', h);
  }, []);
  if (!msg) return null;
  return (
    <div className="toast" role="status" onClick={() => setMsg(null)}>
      {msg}
    </div>
  );
}
