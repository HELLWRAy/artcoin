import axios from "axios";
import { NextResponse } from "next/server";

export const POST = async (req: Request) => {
    const { hash } = await req.json()

    const requestOptions: any = {
        headers: {
            'token': process.env.SOLSCAN_API_KEY,
        },
        params: {
            tx: hash
        },
    };

    const response = await axios.get(
        `https://pro-api.solscan.io/v2.0/transaction/detail`,
        requestOptions
    );

    const data = {
        signature: hash,
        from: response.data.data.signer[0],
        amount: 0,
        slot: response.data.data.block_id,
        blockTime: response.data.data.block_time,
        activity_type: "",
    }
    return NextResponse.json(data)
}   