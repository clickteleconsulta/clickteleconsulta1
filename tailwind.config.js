/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        // Precisa bater com o body em src/index.css. Antes daqui saía
        // "Nunito Sans", que nem era carregada: quem usasse `font-sans` pegava a
        // fonte do sistema, diferente do resto do site.
        sans: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Escala própria da marca — cobalto suave. O 600 é a cor de ação (#3B5BA5),
        // escolhida por ficar no único vão livre da faixa azul (222°), longe de
        // BoaConsulta (200°), Doctolib (206°) e Alan (241°). Ver docs/TROCA-DE-MARCA.md.
        brand: {
          50: "#F2F5FB",
          100: "#E3EAF6",
          200: "#C9D6EE",
          300: "#A3B8DF",
          400: "#7893CB",
          500: "#5674B4",
          600: "#3B5BA5",
          700: "#334D8A",
          800: "#2C4171",
          900: "#28385C",
          950: "#1A253C",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          dark: "hsl(var(--primary-dark))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      /**
       * UM raio só, e a pílula.
       *
       * A escala do shadcn deriva três degraus do token (6, 4 e 2px). Medido
       * numa tela de /agendamentos, isso punha 2px em 29 elementos, 4px em 11
       * e 6px em 9 — três valores a 2px de distância um do outro. Ninguém lê
       * isso como hierarquia; lê como acabamento irregular. Um canto ou é reto
       * e afirma, ou é arredondado e afirma; 2px é "quase reto", que é a única
       * coisa que ele não pode ser.
       *
       * O caminho óbvio seria abrir a escala (8 / 6 / 4). Não dá: o token de
       * 6px foi escolhido medindo concorrente (ver o comentário do --radius em
       * index.css), e subir joga a interface em cima da Medprev. E um degrau de
       * 2px continuaria sendo um degrau de 2px — o mesmo defeito, deslocado.
       *
       * Então os três nomes apontam para o MESMO valor. A hierarquia de forma
       * passa a ser binária: tudo que tem canto tem 6px, e o que é redondo por
       * natureza (foto, ponto de status, contador, barra) é `rounded-full`. Os
       * nomes sobrevivem porque os primitivos do shadcn os têm escritos por
       * dentro, e porque dizem a INTENÇÃO de quem escreveu — `lg` em
       * superfície, `md` em controle. Se um dia os degraus voltarem a se
       * separar, a semântica já está no lugar certo.
       *
       * `xl` e `2xl` continuam fora da escala de propósito: só a tela de
       * chamada de vídeo os usa, nos balões de conversa, que são capsulares por
       * convenção e não por descuido.
       */
      borderRadius: {
        DEFAULT: "var(--radius)",
        lg: "var(--radius)",
        md: "var(--radius)",
        sm: "var(--radius)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}