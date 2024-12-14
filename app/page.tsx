"use client";

import dynamic from 'next/dynamic';

const SolanaArtGrid = dynamic(() => import('../components/solana-art-grid'), { ssr: false });

export default function Page() {
  return (
    <div>
      <SolanaArtGrid />
    </div>
  );
}