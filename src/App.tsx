import { ServiceForm } from './components/ServiceForm';

function App() {
  return (
    <div className="min-h-screen bg-[#F6F8FB] flex flex-col">
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center sm:justify-start">
            <img
              src="/screenshot_2025-12-19_at_9.57.19_am.png"
              alt="Clean Pool"
              className="h-10 sm:h-12"
            />
          </div>
        </div>
      </header>

      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#6D7689] mb-3">
              Registro de Serviço
            </h1>
            <p className="text-[#838B9B] text-sm sm:text-base max-w-2xl mx-auto">
              Preencha e envie para o cliente e para a Clean Pool.
            </p>
          </div>

          <ServiceForm />
        </div>
      </main>

      <footer className="bg-white border-t border-gray-100 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-[#838B9B]">
            Clean Pool • Atendimento e manutenção
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
