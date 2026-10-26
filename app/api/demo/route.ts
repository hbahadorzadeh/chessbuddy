import { playMove } from '@/lib/chess';
export async function POST(request: Request) {
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) return Response.json({error:'Origin not allowed'}, {status:403});
  try {
    const text = await request.text();
    if (text.length > 12000) return Response.json({error:'Request too large'}, {status:413});
    return Response.json(playMove(JSON.parse(text)));
  } catch {
    return Response.json({error:'Invalid position history or illegal move. No move was applied.'}, {status:400});
  }
}
