import axios from 'axios';

export interface RepoInfo {
  owner: string;
  repo: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  createdAt: string;
  updatedAt: string;
  defaultBranch: string;
  isFork: boolean;
}

export interface FileContent {
  path: string;
  content: string;
  size: number;
}

export class GitHubScanner {
  private githubToken?: string;
  private baseUrl = 'https://api.github.com';

  constructor(githubToken?: string) {
    this.githubToken = githubToken;
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json'
    };
    if (this.githubToken) {
      headers['Authorization'] = `token ${this.githubToken}`;
    }
    return headers;
  }

  async parseRepoUrl(url: string): Promise<{ owner: string; repo: string } | null> {
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/]+)(?:\.git)?(?:\/|$)/,
      /^([^\/]+)\/([^\/]+)$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace(/\.git$/, '')
        };
      }
    }

    return null;
  }

  async getRepoInfo(owner: string, repo: string): Promise<RepoInfo | null> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/repos/${owner}/${repo}`,
        { headers: this.getHeaders() }
      );

      const data = response.data;
      return {
        owner: data.owner.login,
        repo: data.name,
        fullName: data.full_name,
        description: data.description,
        language: data.language,
        stars: data.stargazers_count,
        forks: data.forks_count,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        defaultBranch: data.default_branch,
        isFork: data.fork
      };
    } catch (error) {
      return null;
    }
  }

  async getRepoContents(owner: string, repo: string, path: string = ''): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/repos/${owner}/${repo}/contents/${path}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      return [];
    }
  }

  async getFileContent(owner: string, repo: string, path: string): Promise<string | null> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/repos/${owner}/${repo}/contents/${path}`,
        { headers: this.getHeaders() }
      );

      if (response.data.content && response.data.encoding === 'base64') {
        return Buffer.from(response.data.content, 'base64').toString('utf-8');
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async searchFiles(owner: string, repo: string, query: string): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/search/code?q=repo:${owner}/${repo}+${encodeURIComponent(query)}`,
        { headers: this.getHeaders() }
      );
      return response.data.items || [];
    } catch (error) {
      return [];
    }
  }

  async getRepoLanguages(owner: string, repo: string): Promise<Record<string, number>> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/repos/${owner}/${repo}/languages`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      return {};
    }
  }

  async getContributors(owner: string, repo: string): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/repos/${owner}/${repo}/contributors?per_page=1`,
        { headers: this.getHeaders() }
      );
      const linkHeader = response.headers.link;
      if (linkHeader) {
        const lastMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
        if (lastMatch) {
          return parseInt(lastMatch[1], 10);
        }
      }
      return response.data.length;
    } catch (error) {
      return 0;
    }
  }

  async getRecentCommits(owner: string, repo: string, days: number = 90): Promise<number> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const response = await axios.get(
        `${this.baseUrl}/repos/${owner}/${repo}/commits?since=${since}&per_page=1`,
        { headers: this.getHeaders() }
      );
      const linkHeader = response.headers.link;
      if (linkHeader) {
        const lastMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
        if (lastMatch) {
          return parseInt(lastMatch[1], 10);
        }
      }
      return response.data.length;
    } catch (error) {
      return 0;
    }
  }

  async checkFileExists(owner: string, repo: string, path: string): Promise<boolean> {
    try {
      await axios.get(
        `${this.baseUrl}/repos/${owner}/${repo}/contents/${path}`,
        { headers: this.getHeaders() }
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  async checkCIWorkflows(owner: string, repo: string): Promise<boolean> {
    const ciPaths = [
      '.github/workflows',
      '.gitlab-ci.yml',
      '.travis.yml',
      'circleci',
      'azure-pipelines.yml',
      '.drone.yml'
    ];
    
    for (const path of ciPaths) {
      if (await this.checkFileExists(owner, repo, path)) {
        return true;
      }
    }
    return false;
  }

  async getReadme(owner: string, repo: string): Promise<string | null> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/repos/${owner}/${repo}/readme`,
        { headers: this.getHeaders() }
      );

      if (response.data.content && response.data.encoding === 'base64') {
        return Buffer.from(response.data.content, 'base64').toString('utf-8');
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async getRepoTree(owner: string, repo: string, branch: string): Promise<string[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
        { headers: this.getHeaders() }
      );

      if (response.data.tree && Array.isArray(response.data.tree)) {
        return response.data.tree
          .filter((item: any) => item.type === 'blob')
          .map((item: any) => item.path);
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  async getLatestCommitSha(owner: string, repo: string, branch: string): Promise<string | null> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/repos/${owner}/${repo}/commits/${branch}`,
        { headers: this.getHeaders() }
      );
      return response.data.sha || null;
    } catch (error) {
      try {
        const response = await axios.get(
          `${this.baseUrl}/repos/${owner}/${repo}/commits?sha=${branch}&per_page=1`,
          { headers: this.getHeaders() }
        );
        return response.data[0]?.sha || null;
      } catch (error) {
        return null;
      }
    }
  }
}


