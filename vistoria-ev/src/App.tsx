import { useEffect, useState } from 'react';
import { Toast } from './components/Toast';
import { lerRota, type Rota } from './lib/rota';
import { ListaVistorias } from './screens/ListaVistorias';
import { VistoriaTela } from './screens/Vistoria';

export default function App() {
  const [rota, setRota] = useState<Rota>(lerRota());
  useEffect(() => {
    const h = () => {
      setRota(lerRota());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);

  return (
    <>
      {rota.tela === 'lista' ? <ListaVistorias /> : <VistoriaTela key={rota.id} rota={rota} />}
      <Toast />
    </>
  );
}
