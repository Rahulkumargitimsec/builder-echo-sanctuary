import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'GridSense AI',
    template: '%s | GridSense AI'
  },
  description: 'Intelligent electricity demand and peak-load forecasting for the Delhi power grid.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
