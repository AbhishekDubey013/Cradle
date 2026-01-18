import { NextResponse } from 'next/server';
// #region agent log
console.error('[DEBUG-A] validate/route.ts:3 - Import validateBlueprint');
// #endregion
import { validateBlueprint } from '@dapp-forge/blueprint-schema';

export const runtime = 'nodejs'; // Force Node.js runtime (not Edge)

export async function POST(request: Request) {
  // #region agent log
  console.error('[DEBUG-B] validate/route.ts:8 - POST handler entry');
  // #endregion
  try {
    // #region agent log
    console.error('[DEBUG-B] validate/route.ts:12 - Before request.json()');
    // #endregion
    const body = await request.json();
    // #region agent log
    console.error('[DEBUG-B] validate/route.ts:15 - After request.json()', { hasBlueprint: !!body.blueprint });
    // #endregion
    // #region agent log
    console.error('[DEBUG-D] validate/route.ts:18 - Before validateBlueprint');
    // #endregion
    const result = validateBlueprint(body.blueprint);
    // #region agent log
    console.error('[DEBUG-D] validate/route.ts:21 - After validateBlueprint', { valid: result.valid, errorCount: result.errors.length });
    // #endregion
    
    return NextResponse.json(result, {
      status: result.valid ? 200 : 400,
    });
  } catch (error) {
    // #region agent log
    console.error('[DEBUG-A,B,D] validate/route.ts:28 - Error caught', {
      errorMessage: error instanceof Error ? error.message : 'unknown',
      errorName: error instanceof Error ? error.name : 'unknown',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : 'none',
    });
    // #endregion
    return NextResponse.json(
      { 
        valid: false, 
        errors: [{ 
          path: '', 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'PARSE_ERROR',
        }],
        warnings: [],
      },
      { status: 400 }
    );
  }
}

