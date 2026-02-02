import { logger } from '../infrastructure/logging/logger.js';

interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  defaultBranch: string;
  branchMapping: Record<string, string>;
  pathMapping: { prefix: string; replacement: string }[];
}

interface FileContent {
  content: string;
  path: string;
  sha: string;
  size: number;
  encoding: string;
}

interface CommitInfo {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  url: string;
}

interface SearchResult {
  path: string;
  repository: string;
  sha: string;
  url: string;
  score: number;
}

export class GitHubService {
  private baseUrl = 'https://api.github.com';
  private config: GitHubConfig;

  constructor(config: Partial<GitHubConfig> = {}) {
    this.config = {
      token: config.token || process.env.GITHUB_TOKEN || '',
      owner: config.owner || process.env.GITHUB_OWNER || '',
      repo: config.repo || process.env.GITHUB_REPO || '',
      defaultBranch: config.defaultBranch || 'master',
      branchMapping: config.branchMapping || {
        local: 'master',
        test: 'master',
        uat: 'master',
        production: 'master'
      },
      pathMapping: config.pathMapping || [
        { prefix: 'webpack://castlery-web/./', replacement: '' },
        { prefix: 'webpack://./', replacement: '' },
        { prefix: '/@fs/', replacement: '' },
        { prefix: 'webpack:///_N_E/./', replacement: '' }
      ]
    };
  }

  /**
   * 检查 GitHub 配置是否有效
   */
  isConfigured(): boolean {
    return !!(this.config.token && this.config.owner && this.config.repo);
  }


  /**
   * 发送 GitHub API 请求
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Component-Code-Analyzer',
      ...options.headers as Record<string, string>
    };

    if (this.config.token) {
      headers['Authorization'] = `Bearer ${this.config.token}`;
    }

    logger.debug('GitHub API request', { url, method: options.method || 'GET' });

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      logger.error('GitHub API error', { 
        status: response.status, 
        statusText: response.statusText,
        error 
      });
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 标准化文件路径
   */
  normalizePath(filePath: string): string {
    let normalized = filePath;
    for (const mapping of this.config.pathMapping) {
      if (normalized.startsWith(mapping.prefix)) {
        normalized = normalized.replace(mapping.prefix, mapping.replacement);
      }
    }
    // 移除开头的斜杠
    normalized = normalized.replace(/^\/+/, '');
    return normalized;
  }

  /**
   * 根据环境获取对应分支
   */
  getBranchForEnvironment(environment: string): string {
    return this.config.branchMapping[environment] || this.config.defaultBranch;
  }

  /**
   * 获取文件内容
   */
  async getFileContent(filePath: string, branch?: string): Promise<FileContent> {
    const normalizedPath = this.normalizePath(filePath);
    const ref = branch || this.config.defaultBranch;
    
    console.log('\n' + '='.repeat(60));
    console.log('📂 [GITHUB] Fetching file content');
    console.log('='.repeat(60));
    console.log('Original path:', filePath);
    console.log('Normalized path:', normalizedPath);
    console.log('Branch:', ref);
    console.log('Repository:', `${this.config.owner}/${this.config.repo}`);
    console.log('='.repeat(60) + '\n');

    const endpoint = `/repos/${this.config.owner}/${this.config.repo}/contents/${encodeURIComponent(normalizedPath)}?ref=${ref}`;
    
    const data = await this.request<any>(endpoint);
    
    if (data.type !== 'file') {
      throw new Error(`Path is not a file: ${normalizedPath}`);
    }

    // GitHub 返回 base64 编码的内容
    const content = data.encoding === 'base64' 
      ? Buffer.from(data.content, 'base64').toString('utf-8')
      : data.content;

    console.log('✅ [GITHUB] File fetched successfully');
    console.log('Size:', data.size, 'bytes');
    console.log('SHA:', data.sha);

    return {
      content,
      path: data.path,
      sha: data.sha,
      size: data.size,
      encoding: 'utf-8'
    };
  }


  /**
   * 获取文件的提交历史
   */
  async getFileHistory(filePath: string, limit = 10): Promise<CommitInfo[]> {
    const normalizedPath = this.normalizePath(filePath);
    const endpoint = `/repos/${this.config.owner}/${this.config.repo}/commits?path=${encodeURIComponent(normalizedPath)}&per_page=${limit}`;
    
    const commits = await this.request<any[]>(endpoint);
    
    return commits.map(commit => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: {
        name: commit.commit.author.name,
        email: commit.commit.author.email,
        date: commit.commit.author.date
      },
      url: commit.html_url
    }));
  }

  /**
   * 搜索文件
   */
  async searchFiles(query: string, extension?: string): Promise<SearchResult[]> {
    let searchQuery = `${query} repo:${this.config.owner}/${this.config.repo}`;
    if (extension) {
      searchQuery += ` extension:${extension}`;
    }

    const endpoint = `/search/code?q=${encodeURIComponent(searchQuery)}`;
    const data = await this.request<{ items: any[] }>(endpoint);

    return data.items.map(item => ({
      path: item.path,
      repository: item.repository.full_name,
      sha: item.sha,
      url: item.html_url,
      score: item.score
    }));
  }

  /**
   * 根据组件名搜索文件
   */
  async findComponentFile(componentName: string): Promise<string | null> {
    console.log('\n🔎 [GITHUB SEARCH] Searching for component:', componentName);
    
    // 清理组件名（移除 DOM 元素前缀如 div., span. 等）
    let cleanName = componentName;
    if (cleanName.includes('.')) {
      // 如果是 "div.ClassName" 格式，提取类名
      const parts = cleanName.split('.');
      // 检查第一部分是否是 HTML 标签
      const htmlTags = ['div', 'span', 'button', 'a', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'li', 'img', 'input', 'form', 'section', 'article', 'header', 'footer', 'nav', 'main'];
      if (htmlTags.includes(parts[0].toLowerCase())) {
        cleanName = parts.slice(1).join('.');
        console.log('  Cleaned name (removed HTML tag):', cleanName);
      }
    }
    
    // 如果是 MUI 组件类名，尝试提取组件名
    if (cleanName.startsWith('Mui') || cleanName.includes('MuiCardContent')) {
      const muiMatch = cleanName.match(/Mui(\w+)/);
      if (muiMatch) {
        console.log('  Detected MUI component:', muiMatch[1]);
        console.log('  ⚠️ MUI components are from @mui/material, not in project repo');
        return null;
      }
    }
    
    // 如果名称太短或看起来不像组件名，跳过搜索
    if (cleanName.length < 3 || /^[a-z]/.test(cleanName)) {
      console.log('  ⚠️ Name too short or not a component name, skipping search');
      return null;
    }
    
    try {
      console.log('  Searching GitHub for:', cleanName);
      // 搜索 .tsx 文件
      const results = await this.searchFiles(cleanName, 'tsx');
      console.log('  Search results:', results.length);
      
      if (results.length > 0) {
        console.log('  Top results:');
        results.slice(0, 5).forEach((r, i) => {
          console.log(`    ${i + 1}. ${r.path}`);
        });
      }
      
      // 优先匹配文件名完全匹配的
      const exactMatch = results.find(r => {
        const fileName = r.path.split('/').pop()?.replace('.tsx', '');
        return fileName === cleanName;
      });

      if (exactMatch) {
        console.log('  ✅ Exact match found:', exactMatch.path);
        return exactMatch.path;
      }

      // 返回第一个结果
      if (results[0]) {
        console.log('  ✅ Using first result:', results[0].path);
        return results[0].path;
      }
      
      console.log('  ❌ No results found');
      return null;
    } catch (error) {
      console.error('  ❌ Search failed:', error);
      logger.warn('Failed to search for component file', { componentName, error });
      return null;
    }
  }

  /**
   * 获取仓库信息
   */
  async getRepoInfo(): Promise<{ defaultBranch: string; private: boolean; fullName: string }> {
    const endpoint = `/repos/${this.config.owner}/${this.config.repo}`;
    const data = await this.request<any>(endpoint);
    
    return {
      defaultBranch: data.default_branch,
      private: data.private,
      fullName: data.full_name
    };
  }

  /**
   * 获取分支列表
   */
  async getBranches(): Promise<string[]> {
    const endpoint = `/repos/${this.config.owner}/${this.config.repo}/branches?per_page=100`;
    const branches = await this.request<any[]>(endpoint);
    return branches.map(b => b.name);
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(filePath: string, branch?: string): Promise<boolean> {
    try {
      await this.getFileContent(filePath, branch);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取目录内容
   */
  async getDirectoryContents(dirPath: string, branch?: string): Promise<{ name: string; type: string; path: string }[]> {
    const normalizedPath = this.normalizePath(dirPath);
    const ref = branch || this.config.defaultBranch;
    const endpoint = `/repos/${this.config.owner}/${this.config.repo}/contents/${encodeURIComponent(normalizedPath)}?ref=${ref}`;
    
    const data = await this.request<any[]>(endpoint);
    
    return data.map(item => ({
      name: item.name,
      type: item.type,
      path: item.path
    }));
  }

  /**
   * 生成 GitHub 文件链接
   */
  getFileUrl(filePath: string, branch?: string, lineNumber?: number): string {
    const normalizedPath = this.normalizePath(filePath);
    const ref = branch || this.config.defaultBranch;
    let url = `https://github.com/${this.config.owner}/${this.config.repo}/blob/${ref}/${normalizedPath}`;
    if (lineNumber) {
      url += `#L${lineNumber}`;
    }
    return url;
  }
}

// 单例实例
export const githubService = new GitHubService();
