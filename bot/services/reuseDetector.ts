import axios from 'axios';
import { GitHubScanner, RepoInfo } from './githubScanner';

export interface ReuseAnalysis {
  reuseScore: number;
  verdict: 'ORIGINAL' | 'FORKED' | 'HEAVILY_REUSED' | 'LIKELY_STOLEN';
  possibleSources: string[];
  similarityIndicators: string[];
}

export class ReuseDetector {
  private scanner: GitHubScanner;

  constructor(scanner: GitHubScanner) {
    this.scanner = scanner;
  }

  async detectReuse(owner: string, repo: string): Promise<ReuseAnalysis> {
    const repoInfo = await this.scanner.getRepoInfo(owner, repo);
    if (!repoInfo) {
      return {
        reuseScore: 0,
        verdict: 'ORIGINAL',
        possibleSources: [],
        similarityIndicators: []
      };
    }

    const indicators: string[] = [];
    let reuseScore = 0;
    const possibleSources: string[] = [];

    if (repoInfo.isFork) {
      reuseScore += 30;
      indicators.push('Repository is marked as a fork');
    }

    const contents = await this.scanner.getRepoContents(owner, repo);
    const languages = await this.scanner.getRepoLanguages(owner, repo);

    const structureScore = await this.analyzeStructure(owner, repo, contents);
    reuseScore += structureScore.score;
    indicators.push(...structureScore.indicators);

    const codeSimilarity = await this.analyzeCodeSimilarity(owner, repo, languages);
    reuseScore += codeSimilarity.score;
    indicators.push(...codeSimilarity.indicators);
    possibleSources.push(...codeSimilarity.sources);

    const commitHistory = await this.analyzeCommitHistory(owner, repo);
    reuseScore += commitHistory.score;
    indicators.push(...commitHistory.indicators);

    reuseScore = Math.min(100, reuseScore);
    const verdict = this.determineVerdict(reuseScore, repoInfo.isFork);

    return {
      reuseScore,
      verdict,
      possibleSources: [...new Set(possibleSources)],
      similarityIndicators: indicators
    };
  }

  private async analyzeStructure(
    owner: string,
    repo: string,
    contents: any[]
  ): Promise<{ score: number; indicators: string[] }> {
    const indicators: string[] = [];
    let score = 0;

    const commonStructurePatterns = [
      'src/main.rs',
      'src/lib.rs',
      'contracts/',
      'hardhat.config.js',
      'truffle-config.js',
      'package.json',
      'Cargo.toml',
      'go.mod',
      'requirements.txt'
    ];

    const filePaths = contents.map((f: any) => f.path.toLowerCase());
    let matches = 0;

    for (const pattern of commonStructurePatterns) {
      if (filePaths.some((p: string) => p.includes(pattern.toLowerCase()))) {
        matches++;
      }
    }

    if (matches > 5) {
      score += 15;
      indicators.push('Matches common project structure patterns');
    }

    if (contents.length < 10) {
      score += 10;
      indicators.push('Unusually small repository');
    }

    return { score, indicators };
  }

  private async analyzeCodeSimilarity(
    owner: string,
    repo: string,
    languages: Record<string, number>
  ): Promise<{ score: number; indicators: string[]; sources: string[] }> {
    const indicators: string[] = [];
    const sources: string[] = [];
    let score = 0;

    const commonWeb3Patterns = [
      'ERC20',
      'ERC721',
      'OpenZeppelin',
      'Hardhat',
      'Truffle',
      'Web3.js',
      'ethers.js'
    ];

    const contents = await this.scanner.getRepoContents(owner, repo);
    
    for (const file of contents.slice(0, 20)) {
      if (file.type !== 'file') continue;
      
      const content = await this.scanner.getFileContent(owner, repo, file.path);
      if (!content) continue;

      for (const pattern of commonWeb3Patterns) {
        if (content.includes(pattern)) {
          score += 2;
          if (!indicators.includes(`Contains ${pattern} patterns`)) {
            indicators.push(`Contains ${pattern} patterns`);
          }
        }
      }
    }

    if (Object.keys(languages).length === 0) {
      score += 5;
      indicators.push('No language statistics available');
    }

    return { score, indicators, sources };
  }

  private async analyzeCommitHistory(
    owner: string,
    repo: string
  ): Promise<{ score: number; indicators: string[] }> {
    const indicators: string[] = [];
    let score = 0;

    try {
      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      const commits = response.data;
      if (commits.length === 0) {
        score += 20;
        indicators.push('No commit history');
      } else if (commits.length === 1) {
        score += 15;
        indicators.push('Single initial commit (possible copy-paste)');
      }
    } catch (error) {
      score += 10;
      indicators.push('Unable to analyze commit history');
    }

    return { score, indicators };
  }

  private determineVerdict(
    score: number,
    isFork: boolean
  ): 'ORIGINAL' | 'FORKED' | 'HEAVILY_REUSED' | 'LIKELY_STOLEN' {
    if (isFork) {
      return 'FORKED';
    }

    if (score >= 80) {
      return 'LIKELY_STOLEN';
    } else if (score >= 60) {
      return 'HEAVILY_REUSED';
    } else if (score >= 30) {
      return 'FORKED';
    }

    return 'ORIGINAL';
  }
}
