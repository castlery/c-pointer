import { Router, type IRouter } from 'express';
import { githubService } from '../../services/githubService.js';

const router: IRouter = Router();

/**
 * GET /api/github/status
 * 检查 GitHub 连接状态
 */
router.get('/status', async (_req, res) => {
  const configured = githubService.isConfigured();
  
  if (!configured) {
    return res.json({
      configured: false,
      message: 'GitHub not configured. Set GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO in .env'
    });
  }

  try {
    const repoInfo = await githubService.getRepoInfo();
    res.json({
      configured: true,
      connected: true,
      repository: repoInfo.fullName,
      defaultBranch: repoInfo.defaultBranch,
      private: repoInfo.private
    });
  } catch (error) {
    res.json({
      configured: true,
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/github/branches
 * 获取分支列表
 */
router.get('/branches', async (_req, res) => {
  try {
    const branches = await githubService.getBranches();
    res.json({ branches });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/github/file
 * 获取文件内容
 * Query params: path, branch
 */
router.get('/file', async (req, res) => {
  const { path, branch } = req.query;
  
  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'Missing path parameter' });
  }

  try {
    const content = await githubService.getFileContent(path, branch as string);
    res.json(content);
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : 'File not found' });
  }
});

/**
 * GET /api/github/search
 * 搜索文件
 * Query params: q, extension
 */
router.get('/search', async (req, res) => {
  const { q, extension } = req.query;
  
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Missing q parameter' });
  }

  try {
    const results = await githubService.searchFiles(q, extension as string);
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Search failed' });
  }
});

export default router;
