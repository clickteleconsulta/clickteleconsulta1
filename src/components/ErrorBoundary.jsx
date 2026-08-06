import React from 'react';
import { relatarErro } from '@/lib/relatarErro';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // O console continua, porque é o que serve durante o desenvolvimento.
    // O relato é o que faltava: sem ele, erro em produção não chegava a
    // ninguém — a pessoa via a tela de falha e ia embora em silêncio.
    console.error('ErrorBoundary caught:', error, errorInfo);
    relatarErro(error, 'react');
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Algo deu errado</h1>
            <p className="text-gray-600 mb-4">Ocorreu um erro inesperado. Por favor, recarregue a página.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
            >
              Recarregar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
