import { CircleAlert, CircleCheck, LoaderCircle, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Boton } from './ui';

const claseInput =
  'h-9 w-full rounded-lg border border-line bg-surface px-3 text-[13px] text-ink focus-visible:outline-2 focus-visible:outline-accent';

export function DialogoClave({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (abierto) { setActual(''); setNueva(''); setConfirmar(''); setError(null); setListo(false); }
  }, [abierto]);

  if (!abierto) return null;

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (nueva !== confirmar) { setError('Las contraseñas nuevas no coinciden.'); return; }
    setEnviando(true); setError(null);
    const r = await window.api.cambiarClave(actual, nueva);
    setEnviando(false);
    if (r.ok) setListo(true); else setError(r.error);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6 backdrop-blur-[2px]" onMouseDown={onCerrar}>
      <form
        onSubmit={guardar}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-[400px] overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-[15px] font-semibold">Cambiar contraseña</h2>
          <Boton type="button" variante="fantasma" onClick={onCerrar} aria-label="Cerrar" className="-mr-2 w-9 justify-center px-0!">
            <X className="size-4" />
          </Boton>
        </header>
        <div className="space-y-3 px-5 py-4">
          {listo ? (
            <p className="flex items-center gap-2 text-[13px] text-ink"><CircleCheck className="size-4 text-good" />Contraseña actualizada.</p>
          ) : (
            <>
              <label className="flex flex-col gap-1.5 text-[12px] font-medium text-ink-2">
                Contraseña actual
                <input type="password" className={claseInput} value={actual} onChange={(e) => setActual(e.target.value)} autoFocus autoComplete="current-password" />
              </label>
              <label className="flex flex-col gap-1.5 text-[12px] font-medium text-ink-2">
                Nueva contraseña (mínimo 6 caracteres)
                <input type="password" className={claseInput} value={nueva} onChange={(e) => setNueva(e.target.value)} autoComplete="new-password" />
              </label>
              <label className="flex flex-col gap-1.5 text-[12px] font-medium text-ink-2">
                Repite la nueva contraseña
                <input type="password" className={claseInput} value={confirmar} onChange={(e) => setConfirmar(e.target.value)} autoComplete="new-password" />
              </label>
              {error && (
                <p className="flex items-start gap-2 rounded-lg border border-critical/40 bg-critical-soft px-3 py-2 text-[12.5px] text-ink">
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-critical" />{error}
                </p>
              )}
            </>
          )}
        </div>
        <footer className="flex justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3">
          {listo ? (
            <Boton type="button" variante="primario" onClick={onCerrar}>Cerrar</Boton>
          ) : (
            <>
              <Boton type="button" variante="fantasma" onClick={onCerrar}>Cancelar</Boton>
              <Boton type="submit" variante="primario" disabled={enviando || !actual || !nueva || !confirmar}>
                {enviando && <LoaderCircle className="size-4 animate-spin" />}
                Guardar
              </Boton>
            </>
          )}
        </footer>
      </form>
    </div>
  );
}
