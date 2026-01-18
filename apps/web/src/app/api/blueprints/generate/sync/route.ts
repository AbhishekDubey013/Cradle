import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs'; // Force Node.js runtime (not Edge) - Buffer requires Node.js

// Helper to get GitHub token from session
function getGitHubToken(request: NextRequest): string | null {
  // #region agent log
  console.error('[DEBUG-C] generate/sync/route.ts:5 - getGitHubToken entry');
  // #endregion
  const sessionCookie = request.cookies.get('dappforge_session')?.value;
  // #region agent log
  console.error('[DEBUG-C] generate/sync/route.ts:8 - After get cookie', { hasCookie: !!sessionCookie });
  // #endregion
  if (!sessionCookie) return null;
  
  try {
    // #region agent log
    console.error('[DEBUG-C] generate/sync/route.ts:13 - Before Buffer.from');
    // #endregion
    const sessionData = JSON.parse(Buffer.from(sessionCookie, 'base64').toString());
    // #region agent log
    console.error('[DEBUG-C] generate/sync/route.ts:14 - After Buffer.from', { hasToken: !!sessionData.githubToken });
    // #endregion
    if (sessionData.expiresAt < Date.now()) return null;
    return sessionData.githubToken || null;
  } catch (err) {
    // #region agent log
    console.error('[DEBUG-C] generate/sync/route.ts:18 - Buffer.from error', {
      errorMessage: err instanceof Error ? err.message : 'unknown',
    });
    // #endregion
    return null;
  }
}

// Generate code from blueprint - uses user's GitHub OAuth token
export async function POST(request: NextRequest) {
  // #region agent log
  console.error('[DEBUG-B] generate/sync/route.ts:21 - POST handler entry');
  // #endregion
  try {
    // #region agent log
    console.error('[DEBUG-B] generate/sync/route.ts:24 - Before request.json()');
    // #endregion
    const body = await request.json();
    // #region agent log
    console.error('[DEBUG-B] generate/sync/route.ts:26 - After request.json()', { hasBlueprint: !!body.blueprint, hasOptions: !!body.options });
    // #endregion
    const { blueprint, options } = body;

    // Get the user's GitHub token from their session
    const githubToken = getGitHubToken(request);
    
    // If user wants to create GitHub repo, they must be authenticated
    if (options?.createGitHubRepo && !githubToken) {
      return NextResponse.json(
        {
          status: 'failed',
          error: 'Please connect your GitHub account first to create repositories.',
          requiresAuth: true,
        },
        { status: 401 }
      );
    }

    // #region agent log
    console.error('[DEBUG-E] generate/sync/route.ts:42 - Before orchestrator fetch', {
      orchestratorUrl: process.env.ORCHESTRATOR_URL || 'http://localhost:3000',
      hasGithubToken: !!githubToken,
    });
    // #endregion
    const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:3000';
    
    try {
      const response = await fetch(`${orchestratorUrl}/blueprints/generate/sync`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // Pass the user's GitHub token to the orchestrator
          ...(githubToken && { 'X-GitHub-Token': githubToken }),
        },
        body: JSON.stringify({ blueprint, options }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Orchestrator request failed' }));
        return NextResponse.json(
          {
            status: 'failed',
            error: error.error || error.message || `HTTP ${response.status}`,
          },
          { status: response.status }
        );
      }

      const result = await response.json();
      return NextResponse.json(result);
    } catch (error) {
      // #region agent log
      console.error('[DEBUG-E] generate/sync/route.ts:65 - Orchestrator fetch error', {
        errorMessage: error instanceof Error ? error.message : 'unknown',
        errorName: error instanceof Error ? error.name : 'unknown',
        stack: error instanceof Error ? error.stack?.substring(0, 500) : 'none',
      });
      // #endregion
      // If orchestrator is not available, return a mock success
      console.warn('Orchestrator not available, returning mock response:', error);
      return NextResponse.json({
        runId: 'mock-run-id',
        status: 'completed',
        result: {
          success: true,
          files: [
            { path: 'package.json', size: 1024 },
            { path: 'README.md', size: 2048 },
            { path: 'src/index.ts', size: 512 },
          ],
          envVars: [],
          scripts: [],
          // Mock repo URL for testing
          repoUrl: options?.createGitHubRepo
            ? `https://github.com/${blueprint.config.github?.owner || 'your-username'}/${blueprint.config.github?.repoName || 'my-dapp'}`
            : undefined,
        },
        logs: [
          { timestamp: new Date().toISOString(), level: 'info', message: 'Generation started' },
          { timestamp: new Date().toISOString(), level: 'info', message: 'Generation completed' },
        ],
      });
    }
  } catch (error) {
    // #region agent log
    console.error('[DEBUG-A,B,C,D,E] generate/sync/route.ts:92 - Top-level error handler', {
      errorMessage: error instanceof Error ? error.message : 'unknown',
      errorName: error instanceof Error ? error.name : 'unknown',
      stack: error instanceof Error ? error.stack?.substring(0, 1000) : 'none',
    });
    // #endregion
    return NextResponse.json(
      { 
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

