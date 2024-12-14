![ArtCoin Frame](/public/frame.jpg)


# ArtCoin - Generative Art from Solana Transactions

ArtCoin is a dynamic web application that transforms Solana blockchain transactions into unique, generative artwork. Each transaction hash is used as a seed to create beautiful, deterministic art pieces with varying styles, colors, and complexity.

## Features

- **Real-time Transaction Art**: Converts Solana transaction hashes into unique generative art
- **Interactive Grid View**: Infinite scrollable grid of transaction-based artworks
- **Responsive Design**: Works seamlessly across desktop and mobile devices
- **Transaction Details**: View detailed information about each transaction including:
  - Transaction hash
  - Amount
  - Sender/receiver addresses
  - Block time and slot
  - Direct link to Solscan
- **Artwork Attributes**:
  - Color palette
  - Shape distribution
  - Background style
  - Rarity tier (Legendary, Rare, Uncommon, Common)
  - Total shape count
- **Search Functionality**: Look up specific transaction hashes and view their artwork

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Solscan API key
- A Solana token mint address

## Setup

1. Clone the repository:
```bash
git clone https://github.com/artcoinsproject/artcoin
cd artcoin
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file in the root directory with the following variables:
```env
SOLSCAN_API_KEY=your_solscan_api_key_here
TOKEN_MINT_ADDRESS=your_token_mint_address_here
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

6. To use the API, set `const USE_API = true;` in `components/solana-art-grid.tsx`. This will fetch transactions from the API and use them to generate art. In order to use the API, you must have a Solscan API key and a token mint address. (i.e. the token you want to track)

## Environment Variables

- `SOLSCAN_API_KEY`: Your API key from Solscan (Get it from [Solscan](https://docs.solscan.io/api-access/pro-api-endpoints))
- `TOKEN_MINT_ADDRESS`: The Solana token mint address you want to track

## Technical Details

The project uses:
- Next.js for the framework
- React for the UI
- p5.js for generative art
- Tailwind CSS for styling
- TypeScript for type safety

The art generation algorithm considers:
- Transaction hash as a seed
- Multiple background styles
- Various shape types and distributions
- Color palette generation
- Particle systems
- Flow fields

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Solana blockchain
- Solscan API
- p5.js community
