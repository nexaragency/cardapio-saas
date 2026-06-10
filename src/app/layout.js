import "./globals.css";

export const metadata = {
  title: 'Nexar - Cardápio Digital',
  description: 'Cardápio digital profissional para o seu negócio. Delivery, salão e relatórios em um só lugar.',
  icons: {
    icon: '/nexar.png',
    apple: '/nexar.png',
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}