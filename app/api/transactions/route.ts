import axios from 'axios';
import { NextResponse } from 'next/server';

export const revalidate = 5; // Update every 5 seconds

const getRecentTxs = async () => {
    
    if (!process.env.SOLSCAN_API_KEY || !process.env.MINT_ADDRESS) {
        throw new Error('SOLSCAN_API_KEY or TOKEN_MINT_ADDRESS is not set');
    }

    const requestOptions: any = {
        headers: {
            'token': process.env.SOLSCAN_API_KEY,
        },
        params: {
            page_size: 100,
            address: process.env.MINT_ADDRESS
        },
    };

    const response = await axios.get(
        'https://pro-api.solscan.io/v2.0/token/defi/activities',
        requestOptions
    );
    const data = response.data;

    if (data.success && data.data.length > 0) {
        const transactions = data.data.map((activity: any) => ({
            signature: activity.trans_id,
            from: activity.from_address,
            to: activity.to_address,
            amount: activity.routers.amount1?.toString() || '0',
            slot: activity.block_id,
            blockTime: activity.block_time,
            activity_type: activity.activity_type,
        }));
        return transactions
    }  else {
        return []
    }
}

export const GET = async () => {
    const transactions = await getRecentTxs();
    return NextResponse.json(transactions);
}