import "./globals.css";

export const metadata = {
  title: "Обменник",
  description: "Сервис обмена криптовалют и фиатных средств",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}