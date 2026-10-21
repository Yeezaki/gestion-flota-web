import React from 'react';

interface ResponsiveLayoutProps {
  titulo: string;
  subtitulo?: React.ReactNode;
  badge?: string;
  acciones?: React.ReactNode;
  children: React.ReactNode;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  titulo,
  subtitulo,
  badge,
  acciones,
  children
}) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-6">
        
        {/* Cabecera adaptable a PC, tablet y celular */}
        <header className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              {badge && (
                <span className="inline-block text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 mb-2">
                  {badge}
                </span>
              )}
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                {titulo}
              </h1>
              {subtitulo && (
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                  {subtitulo}
                </p>
              )}
            </div>

            {acciones && (
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                {acciones}
              </div>
            )}
          </div>
        </header>

        {/* Contenedor principal de vistas */}
        <main className="space-y-6">
          {children}
        </main>

      </div>
    </div>
  );
};