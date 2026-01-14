import { GitHubScanner, RepoInfo } from './githubScanner';

export interface SecurityFinding {
  type: 'obfuscation' | 'dependency' | 'secret' | 'exploit' | 'contract';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  file?: string;
}

export interface SecurityAnalysis {
  score: number;
  riskLevel: 'SAFE' | 'SUSPICIOUS' | 'DANGEROUS' | 'NON_EXECUTABLE';
  findings: SecurityFinding[];
  repoIntent?: 'EXECUTABLE' | 'NON_EXECUTABLE';
  confidenceLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceScore?: number;
  intentScore?: number;
  scoreRationale?: string;
  riskPosture?: string;
  walletNote?: string;
  intentionalVulnerabilityNote?: string;
}

interface CacheEntry {
  analysis: SecurityAnalysis;
  commitSha: string;
  timestamp: number;
}

export class SecurityAnalyzer {
  private scanner: GitHubScanner;
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 3600000; // 1 hour

  constructor(scanner: GitHubScanner) {
    this.scanner = scanner;
  }

  private getCacheKey(owner: string, repo: string): string {
    return `${owner}/${repo}`;
  }

  private async getCachedResult(owner: string, repo: string, currentSha: string | null): Promise<SecurityAnalysis | null> {
    const key = this.getCacheKey(owner, repo);
    const cached = this.cache.get(key);

    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    if (currentSha && cached.commitSha === currentSha) {
      return { ...cached.analysis, confidenceLevel: 'HIGH', confidenceScore: 95 };
    }

    return null;
  }

  private setCache(owner: string, repo: string, commitSha: string | null, analysis: SecurityAnalysis): void {
    if (!commitSha) return;
    const key = this.getCacheKey(owner, repo);
    this.cache.set(key, {
      analysis,
      commitSha,
      timestamp: Date.now()
    });
  }

  async analyzeRepo(owner: string, repo: string): Promise<SecurityAnalysis> {
    let repoInfo: RepoInfo | null = null;
    let readmeContent: string | null = null;
    let filePaths: string[] = [];
    let languages: Record<string, number> = {};
    let readmeFetched = false;
    let treeFetched = false;
    let filesFetched = false;
    let commitSha: string | null = null;
    const findings: SecurityFinding[] = [];

    try {
      const parsed = await this.scanner.parseRepoUrl(`${owner}/${repo}`).catch(() => null);
      if (parsed) {
        repoInfo = await this.scanner.getRepoInfo(owner, repo).catch(() => null);
        if (repoInfo) {
          commitSha = await this.scanner.getLatestCommitSha(owner, repo, repoInfo.defaultBranch).catch(() => null);
          const cached = await this.getCachedResult(owner, repo, commitSha).catch(() => null);
          if (cached) {
            return cached;
          }
        }
      }
    } catch (error) {
    }

    try {
      if (repoInfo) {
        [readmeContent, filePaths, languages] = await Promise.all([
          this.scanner.getReadme(owner, repo).then(r => { readmeFetched = r !== null; return r; }).catch(() => null),
          this.scanner.getRepoTree(owner, repo, repoInfo.defaultBranch).then(t => { treeFetched = t.length > 0; return t; }).catch(() => []),
          this.scanner.getRepoLanguages(owner, repo).catch(() => ({}))
        ]);
      }
    } catch (error) {
    }

    const contents = filePaths.map(path => ({ type: 'file' as const, path, name: path.split('/').pop() }));
    let repoIntent: 'EXECUTABLE' | 'NON_EXECUTABLE' = 'EXECUTABLE';
    try {
      repoIntent = await this.classifyRepoIntent(owner, repo, contents);
    } catch (error) {
    }
    
    if (repoIntent === 'EXECUTABLE') {
      const patternChecks = [
        this.checkDependencies(owner, repo, findings).catch(() => {}),
        this.checkSecrets(owner, repo, findings).catch(() => {}),
        this.checkObfuscation(owner, repo, findings).catch(() => {}),
        this.checkSmartContracts(owner, repo, languages, findings).catch(() => {}),
        this.checkExploitPatterns(owner, repo, findings).catch(() => {})
      ];

      await Promise.all(patternChecks).catch(() => {});
    }

    const sampleFiles: string[] = [];
    if (filePaths.length > 0) {
      const filesToSample = filePaths.slice(0, 5);
      try {
        const fileContents = await Promise.all(
          filesToSample.map(path => 
            this.scanner.getFileContent(owner, repo, path).catch(() => null)
          )
        );
        filesFetched = fileContents.some(c => c !== null);
        fileContents.forEach((content) => {
          if (content) sampleFiles.push(content);
        });
      } catch (error) {
      }
    }

    const validatedFindings = this.validateFindings(findings, owner, repo, contents);
    const maliciousFindings = this.filterMaliciousOnly(validatedFindings, contents);
    const isSystemCode = this.isSystemOrKernelCode(contents, owner, repo);
    const defaultRepoInfo: RepoInfo = repoInfo || { 
      owner, 
      repo, 
      fullName: `${owner}/${repo}`, 
      description: null, 
      language: null, 
      stars: 0, 
      forks: 0, 
      createdAt: '', 
      updatedAt: '', 
      defaultBranch: 'main', 
      isFork: false 
    };
    const intentScore = this.calculateIntentScore(maliciousFindings, contents, defaultRepoInfo, isSystemCode);
    
    const isIntentionallyVulnerable = this.detectIntentionalVulnerabilityFromContent(owner, repo, defaultRepoInfo, readmeContent, filePaths);
    const hasWalletConnection = this.detectWalletConnectionFromContent(readmeContent, filePaths, sampleFiles);
    
    const score = this.calculateScore(maliciousFindings, hasWalletConnection, isIntentionallyVulnerable);
    const riskLevel = this.determineRiskLevel(score, maliciousFindings, isIntentionallyVulnerable);
    const { confidenceLevel, confidenceScore } = this.calculateConfidence(readmeFetched, treeFetched, filesFetched);
    
    const scoreRationale = this.generateScoreRationale(riskLevel, maliciousFindings, isIntentionallyVulnerable, hasWalletConnection);
    const riskPosture = this.generateRiskPosture(riskLevel, maliciousFindings, contents, owner, repo);
    const walletNote = hasWalletConnection ? 'wallet connection detected (common web3 pattern).\nslight trust adjustment applied.' : undefined;
    const intentionalVulnerabilityNote = isIntentionallyVulnerable ? 'this project appears intentionally vulnerable or educational.\nsecurity risks are expected.' : undefined;

    const analysis: SecurityAnalysis = { 
      score, 
      riskLevel, 
      findings: maliciousFindings, 
      repoIntent, 
      confidenceLevel,
      confidenceScore,
      intentScore,
      scoreRationale,
      riskPosture,
      walletNote,
      intentionalVulnerabilityNote
    };

    if (commitSha) {
      this.setCache(owner, repo, commitSha, analysis);
    }

    return analysis;
  }

  private validateFindings(
    findings: SecurityFinding[],
    owner: string,
    repo: string,
    contents: any[]
  ): SecurityFinding[] {
    const validated: SecurityFinding[] = [];
    const isSystemCode = this.isSystemOrKernelCode(contents, owner, repo);

    for (const finding of findings) {
      if (isSystemCode && this.isNormalSystemPattern(finding)) {
        continue;
      }

      if (finding.severity === 'critical') {
        if (this.isProvablyExploitable(finding, isSystemCode)) {
          validated.push(finding);
        } else {
          validated.push({
            ...finding,
            severity: 'high'
          });
        }
      } else if (finding.severity === 'high') {
        if (this.isComplexityNotVulnerability(finding)) {
          validated.push({
            ...finding,
            severity: 'medium'
          });
        } else {
          validated.push(finding);
        }
      } else {
        validated.push(finding);
      }
    }

    return validated;
  }

  private isComplexityNotVulnerability(finding: SecurityFinding): boolean {
    const complexityPatterns = [
      /missing.*lockfile/i,
      /huge.*codebase/i,
      /large.*codebase/i,
      /complex.*code/i,
      /unsafe.*c.*pattern/i,
      /low.*level.*memory/i,
      /assembly/i,
      /kernel.*macro/i
    ];

    const desc = finding.description || '';
    return complexityPatterns.some(pattern => pattern.test(desc));
  }

  private isSystemOrKernelCode(contents: any[], owner?: string, repo?: string): boolean {
    const systemIndicators = [
      'kernel', 'driver', 'syscall', 'mm/', 'fs/', 'net/', 'arch/',
      'asm/', 'include/linux', 'include/uapi', 'drivers/', 'kernel/'
    ];

    if (owner && (owner.toLowerCase() === 'torvalds' || owner.toLowerCase() === 'linux')) {
      return true;
    }

    if (repo && repo.toLowerCase() === 'linux') {
      return true;
    }

    const paths = contents.map((item: any) => item.path?.toLowerCase() || '').join(' ');
    return systemIndicators.some(indicator => paths.includes(indicator.toLowerCase()));
  }

  private isNormalSystemPattern(finding: SecurityFinding): boolean {
    if (finding.type === 'exploit') {
      const normalPatterns = [
        /memcpy|memmove|memset/i,
        /inline\s+asm/i,
        /__asm__/i,
        /pointer\s+arithmetic/i
      ];
      return normalPatterns.some(pattern => 
        finding.description && pattern.test(finding.description)
      );
    }
    return false;
  }

  private isProvablyExploitable(finding: SecurityFinding, isSystemCode: boolean): boolean {
    if (isSystemCode && this.isNormalSystemPattern(finding)) {
      return false;
    }

    if (finding.type === 'secret') {
      return true;
    }

    if (finding.type === 'exploit') {
      if (!finding.file) return false;
      const description = finding.description || '';
      return /user.*input|network.*input|untrusted|user.*controlled/i.test(description);
    }

    if (finding.type === 'contract') {
      return true;
    }

    if (finding.type === 'obfuscation') {
      return true;
    }

    return false;
  }

  private async checkDependencies(owner: string, repo: string, findings: SecurityFinding[]) {
    const packageFiles = ['package.json', 'requirements.txt', 'Cargo.toml', 'go.mod', 'pom.xml'];
    
    for (const file of packageFiles) {
      const content = await this.scanner.getFileContent(owner, repo, file);
      if (!content) continue;

      try {
        if (file === 'package.json') {
          const parsed = JSON.parse(content);
          if (parsed.dependencies) {
            const knownVulnerable = [
              'lodash@4.17.4',
              'express@4.0.0',
              'axios@0.18.0'
            ];
            
            for (const dep of Object.keys(parsed.dependencies)) {
              const version = parsed.dependencies[dep];
              const depVersion = `${dep}@${version}`;
              if (knownVulnerable.some(v => depVersion.includes(v))) {
                findings.push({
                  type: 'dependency',
                  severity: 'high',
                  description: `Known vulnerable dependency: ${dep}@${version}`,
                  file
                });
              }
            }
          }
        }
      } catch (error) {
        continue;
      }
    }
  }

  private async checkSecrets(owner: string, repo: string, findings: SecurityFinding[]) {
    const secretPatterns = [
      /(?:api[_-]?key|apikey)\s*[:=]\s*["']?[a-zA-Z0-9]{20,}["']?/i,
      /(?:secret|password|token)\s*[:=]\s*["']?[a-zA-Z0-9]{16,}["']?/i,
      /private[_-]?key\s*[:=]/i,
      /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/i
    ];

    const searchTerms = ['api_key', 'secret', 'password', 'token', 'private_key'];
    
    for (const term of searchTerms) {
      const files = await this.scanner.searchFiles(owner, repo, term);
      for (const file of files.slice(0, 8)) {
        if (this.isTestOrExampleFile(file.path)) continue;
        if (file.path.includes('.env.example') || file.path.includes('.env.sample')) continue;

        const content = await this.scanner.getFileContent(owner, repo, file.path);
        if (!content) continue;

        const lines = content.split('\n');
        let foundInCode = false;

        for (let i = 0; i < Math.min(50, lines.length); i++) {
          const line = lines[i];
          if (line.trim().startsWith('//') || line.trim().startsWith('#')) continue;
          if (line.includes('example') || line.includes('sample') || line.includes('placeholder')) continue;

          for (const pattern of secretPatterns) {
            if (pattern.test(line)) {
              foundInCode = true;
              break;
            }
          }
          if (foundInCode) break;
        }

        if (foundInCode) {
          findings.push({
            type: 'secret',
            severity: 'critical',
            description: `Possible hardcoded secret found in ${file.path}`,
            file: file.path
          });
        }
      }
    }
  }

  private isTestOrExampleFile(path: string): boolean {
    const testPatterns = [
      /\/test\//i,
      /\/tests\//i,
      /\/spec\//i,
      /\/__tests__\//i,
      /\.test\./i,
      /\.spec\./i,
      /\/example/i,
      /\/examples\//i,
      /\/demo\//i,
      /\/sample\//i,
      /\/docs\//i,
      /\/documentation\//i
    ];
    return testPatterns.some(pattern => pattern.test(path));
  }

  private async checkObfuscation(owner: string, repo: string, findings: SecurityFinding[]) {
    const jsFiles = await this.scanner.searchFiles(owner, repo, 'extension:js');
    const tsFiles = await this.scanner.searchFiles(owner, repo, 'extension:ts');

    for (const file of [...jsFiles, ...tsFiles].slice(0, 20)) {
      if (this.isTestOrExampleFile(file.path)) continue;

      const content = await this.scanner.getFileContent(owner, repo, file.path);
      if (!content) continue;

      if (content.length < 200) continue;

      const hasEval = /eval\s*\(/.test(content);
      const hasFunctionConstructor = /new\s+Function\s*\(/.test(content);
      const hasHeavyObfuscation = /(\\x[0-9a-f]{2}){20,}/i.test(content) || 
                                   /String\.fromCharCode\([^)]{100,}\)/.test(content);

      if ((hasEval || hasFunctionConstructor) && hasHeavyObfuscation) {
        const lines = content.split('\n');
        let foundInCode = false;

        for (let i = 0; i < Math.min(100, lines.length); i++) {
          const line = lines[i].trim();
          if (line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')) continue;
          if ((hasEval && /eval\s*\(/.test(line)) || (hasFunctionConstructor && /new\s+Function/.test(line))) {
            foundInCode = true;
            break;
          }
        }

        if (foundInCode) {
          findings.push({
            type: 'obfuscation',
            severity: 'high',
            description: `Intentional code obfuscation with execution intent in ${file.path}`,
            file: file.path
          });
        }
      }
    }
  }

  private async checkSmartContracts(
    owner: string,
    repo: string,
    languages: Record<string, number>,
    findings: SecurityFinding[]
  ) {
    const contractLanguages = ['Solidity', 'Rust', 'Move'];
    const hasContractCode = Object.keys(languages).some(lang => 
      contractLanguages.some(cl => lang.includes(cl))
    );

    if (!hasContractCode) return;

    const solFiles = await this.scanner.searchFiles(owner, repo, 'extension:sol');
    const rsFiles = await this.scanner.searchFiles(owner, repo, 'extension:rs');
    const moveFiles = await this.scanner.searchFiles(owner, repo, 'extension:move');

    const contractFiles = [...solFiles, ...rsFiles, ...moveFiles].filter(file => 
      !this.isTestOrExampleFile(file.path)
    );

    for (const file of contractFiles.slice(0, 15)) {
      const content = await this.scanner.getFileContent(owner, repo, file.path);
      if (!content) continue;

      if (file.path.endsWith('.sol')) {
        const contractIssues = [
          { pattern: /\.call\.value\(/, desc: 'Unsafe value transfer', severity: 'critical' as const },
          { pattern: /tx\.origin/, desc: 'Use of tx.origin (vulnerable to phishing)', severity: 'high' as const },
          { pattern: /unchecked\s*\{/, desc: 'Unchecked arithmetic operations', severity: 'high' as const },
          { pattern: /delegatecall/, desc: 'Unsafe delegatecall usage', severity: 'high' as const }
        ];

        for (const issue of contractIssues) {
          if (issue.pattern.test(content)) {
            findings.push({
              type: 'contract',
              severity: issue.severity,
              description: `Smart contract issue: ${issue.desc} in ${file.path}`,
              file: file.path
            });
            break;
          }
        }
      } else if (file.path.endsWith('.rs')) {
        if (/unsafe\s*\{[^}]*\}/.test(content) && content.length > 500) {
          const unsafeBlocks = content.match(/unsafe\s*\{[^}]*\}/g) || [];
          if (unsafeBlocks.length > 5) {
            findings.push({
              type: 'contract',
              severity: 'high',
              description: `Excessive unsafe Rust blocks in ${file.path}`,
              file: file.path
            });
          }
        }
      }
    }
  }

  private async checkExploitPatterns(owner: string, repo: string, findings: SecurityFinding[]) {
    const allFiles = await this.scanner.getRepoContents(owner, repo);
    
    for (const file of allFiles.slice(0, 40)) {
      if (file.type !== 'file') continue;
      if (this.isTestOrExampleFile(file.path)) continue;
      
      const content = await this.scanner.getFileContent(owner, repo, file.path);
      if (!content) continue;

      const lines = content.split('\n');
      let inComment = false;

      for (let i = 0; i < Math.min(150, lines.length); i++) {
        const line = lines[i];
        if (line.includes('/*')) inComment = true;
        if (line.includes('*/')) inComment = false;
        if (inComment || line.trim().startsWith('//')) continue;

        const trimmed = line.trim();
        
        if (/exec\s*\([^)]*\$|shell_exec\s*\([^)]*\$|system\s*\([^)]*\$/i.test(trimmed)) {
          const hasUserInput = /req\.|request\.|\$_|input\(|readline\(|gets\(/i.test(content.substring(Math.max(0, i - 20), Math.min(content.length, i + 20)));
          if (hasUserInput) {
            findings.push({
              type: 'exploit',
              severity: 'critical',
              description: `Unsafe command execution with user input in ${file.path}`,
              file: file.path
            });
            break;
          }
        }

        if (/SQL.*\+.*\+.*\$|query\s*\([^)]*\+/i.test(trimmed)) {
          const hasUserInput = /req\.|request\.|\$_|input\(|readline\(/i.test(content.substring(Math.max(0, i - 30), Math.min(content.length, i + 30)));
          if (hasUserInput) {
            findings.push({
              type: 'exploit',
              severity: 'high',
              description: `SQL injection vulnerability pattern with user input in ${file.path}`,
              file: file.path
            });
            break;
          }
        }
      }
    }
  }

  private async classifyRepoIntent(owner: string, repo: string, contents: any[]): Promise<'EXECUTABLE' | 'NON_EXECUTABLE'> {
    if (contents.length === 0) return 'NON_EXECUTABLE';

    const dependencyManifests = [
      'package.json', 'pnpm-lock.yaml', 'yarn.lock', 'package-lock.json',
      'pyproject.toml', 'requirements.txt', 'setup.py', 'Pipfile', 'poetry.lock',
      'go.mod', 'go.sum',
      'Cargo.toml', 'Cargo.lock',
      'pom.xml', 'build.gradle', 'build.sbt',
      'composer.json', 'composer.lock',
      'Gemfile', 'Gemfile.lock'
    ];

    const buildConfigs = [
      'hardhat.config.js', 'hardhat.config.ts', 'foundry.toml', 'truffle-config.js',
      'webpack.config.js', 'vite.config.js', 'rollup.config.js',
      'tsconfig.json', 'jsconfig.json',
      'Makefile', 'CMakeLists.txt', 'Dockerfile', 'docker-compose.yml'
    ];

    const executableDirs = ['src', 'lib', 'contracts', 'scripts', 'bin', 'build'];
    const executableExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs', '.sol', '.move', '.java', '.kt', '.cpp', '.c', '.sh', '.bat', '.ps1', '.exe', '.bin', '.wasm'];

    const checkItem = (item: any): boolean => {
      if (!item.path) return false;
      const pathLower = item.path.toLowerCase();
      
      if (item.type === 'file') {
        const fileName = pathLower.split('/').pop() || '';
        const dirPath = pathLower.substring(0, pathLower.lastIndexOf('/'));
        
        for (const manifest of dependencyManifests) {
          if (fileName === manifest.toLowerCase()) {
            return true;
          }
        }
        
        for (const config of buildConfigs) {
          if (fileName === config.toLowerCase()) {
            return true;
          }
        }

        for (const ext of executableExtensions) {
          if (pathLower.endsWith(ext)) {
            return true;
          }
        }
      }

      if (item.type === 'dir') {
        const dirName = pathLower.split('/').pop() || '';
        for (const execDir of executableDirs) {
          if (dirName === execDir.toLowerCase()) {
            return true;
          }
        }
      }

      return false;
    };

    for (const item of contents) {
      if (checkItem(item)) {
        return 'EXECUTABLE';
      }
      
      if (item.type === 'dir' && item.path) {
        try {
          const subContents = await this.scanner.getRepoContents(owner, repo, item.path);
          for (const subItem of subContents.slice(0, 20)) {
            if (checkItem(subItem)) {
              return 'EXECUTABLE';
            }
          }
        } catch (error) {
          continue;
        }
      }
    }

    return 'NON_EXECUTABLE';
  }

  private calculateIntentScore(
    findings: SecurityFinding[],
    contents: any[],
    repoInfo: RepoInfo,
    isSystemCode: boolean
  ): number {
    let intentScore = 0;

    if (isSystemCode) {
      intentScore = Math.max(0, intentScore - 10);
    }

    for (const finding of findings) {
      if (!this.isMaliciousIntent(finding)) {
        continue;
      }

      if (finding.type === 'secret' && finding.severity === 'critical') {
        intentScore += 40;
      } else if (finding.type === 'secret') {
        intentScore += 20;
      }

      if (finding.type === 'obfuscation') {
        const desc = finding.description || '';
        if (/network|exfiltrat|exfil|send.*http|fetch.*http/i.test(desc)) {
          intentScore += 30;
        }
      }

      if (finding.type === 'exploit') {
        const desc = finding.description || '';
        if (/wallet.*drain|backdoor|malware|trojan|keylog/i.test(desc)) {
          intentScore += 50;
        } else if (/user.*input|network.*input/i.test(desc) && finding.severity === 'critical') {
          intentScore += 25;
        }
      }

      if (finding.type === 'contract') {
        const desc = finding.description || '';
        if (/wallet.*drain|reentrancy.*exploit|access.*control.*bypass/i.test(desc)) {
          intentScore += 40;
        }
      }
    }

    return Math.min(100, Math.max(0, intentScore));
  }

  private detectWalletConnectionFromContent(
    readmeContent: string | null,
    filePaths: string[],
    fileSamples: string[]
  ): boolean {
    const walletPatterns = [
      'connect wallet',
      'usewallet',
      'window.ethereum',
      'eth_requestaccounts',
      'wallet.connect',
      'ethereum.request',
      'web3modal',
      'useweb3',
      'connectwallet'
    ];

    const haystack = [
      readmeContent || '',
      ...filePaths,
      ...fileSamples
    ].join(' ').toLowerCase();

    return walletPatterns.some(pattern => haystack.includes(pattern));
  }

  private async detectIntentionalVulnerabilityFromContent(
    owner: string,
    repo: string,
    repoInfo: RepoInfo,
    readmeContent: string | null,
    filePaths: string[]
  ): Promise<boolean> {
    const intentKeywords = [
      'vulnerable',
      'damn-vulnerable',
      'exploit',
      'hacking',
      'security-challenge',
      'ctf',
      'ethernaut',
      'intentionally insecure',
      'training',
      'workshop'
    ];

    const searchTexts: string[] = [];

    if (repoInfo.description) {
      searchTexts.push(repoInfo.description.toLowerCase());
    }

    searchTexts.push(repo.toLowerCase());
    searchTexts.push(`${owner}/${repo}`.toLowerCase());

    if (readmeContent) {
      searchTexts.push(readmeContent.toLowerCase());
    }

    for (const filePath of filePaths) {
      const pathLower = filePath.toLowerCase();
      searchTexts.push(pathLower);
      
      const pathParts = filePath.split('/');
      for (const part of pathParts) {
        searchTexts.push(part.toLowerCase());
      }
    }

    const combinedText = searchTexts.join(' ');
    for (const keyword of intentKeywords) {
      if (combinedText.includes(keyword.toLowerCase())) {
        return true;
      }
    }

    return false;
  }

  private calculateScore(
    findings: SecurityFinding[],
    hasWalletConnection: boolean,
    isIntentionallyVulnerable: boolean
  ): number {
    let score = 100;

    for (const finding of findings) {
      if (this.isMaliciousIntent(finding)) {
        switch (finding.severity) {
          case 'critical':
            score -= 30;
            break;
          case 'high':
            score -= 15;
            break;
          case 'medium':
            score -= 8;
            break;
          case 'low':
            score -= 3;
            break;
        }
      } else {
        switch (finding.severity) {
          case 'critical':
            score -= 5;
            break;
          case 'high':
            score -= 3;
            break;
          case 'medium':
            score -= 1;
            break;
          case 'low':
            score -= 0;
            break;
        }
      }
    }

    if (hasWalletConnection) {
      const penalty = Math.floor(Math.random() * 11) + 10;
      score -= penalty;
    }

    if (isIntentionallyVulnerable) {
      const intentPenalty = Math.floor(Math.random() * 16) + 25;
      score -= intentPenalty;
    }

    score = Math.max(0, Math.min(100, score));

    return score;
  }

  private determineRiskLevel(
    score: number,
    findings: SecurityFinding[],
    isIntentionallyVulnerable: boolean
  ): 'SAFE' | 'SUSPICIOUS' | 'DANGEROUS' | 'NON_EXECUTABLE' {
    const hasCritical = findings.some(f => f.severity === 'critical');
    const hasHighOrCritical = findings.some(f => f.severity === 'high' || f.severity === 'critical');

    if (score < 40 || hasCritical) {
      return 'DANGEROUS';
    }

    if (score >= 80 && !isIntentionallyVulnerable && !hasHighOrCritical) {
      return 'SAFE';
    }

    if (isIntentionallyVulnerable || (score >= 40 && score < 80)) {
      return 'SUSPICIOUS';
    }

    return 'SAFE';
  }

  private isTrustedRepo(repoInfo: RepoInfo): boolean {
    const trustedOwners = ['torvalds', 'microsoft', 'google', 'facebook', 'apple', 'github', 'apache', 'eclipse', 'ethereum'];
    return trustedOwners.includes(repoInfo.owner.toLowerCase()) || repoInfo.stars > 10000;
  }

  private calculateReputationBoost(repoInfo: RepoInfo): number {
    let boost = 0;

    if (repoInfo.stars > 10000) {
      boost += 10;
    } else if (repoInfo.stars > 1000) {
      boost += 5;
    } else if (repoInfo.stars > 100) {
      boost += 2;
    }

    const wellKnownOwners = ['torvalds', 'microsoft', 'google', 'facebook', 'apple', 'github', 'apache', 'eclipse'];
    if (wellKnownOwners.includes(repoInfo.owner.toLowerCase())) {
      boost += 10;
    }

    const daysSinceCreation = Math.floor((Date.now() - new Date(repoInfo.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceCreation > 365 * 5) {
      boost += 5;
    } else if (daysSinceCreation > 365) {
      boost += 2;
    }

    return Math.min(20, boost);
  }

  private isMaliciousIntent(finding: SecurityFinding): boolean {
    if (finding.type === 'secret') {
      return true;
    }

    if (finding.type === 'obfuscation') {
      const desc = finding.description || '';
      return /network|exfiltrat|exfil|send.*http|fetch.*http/i.test(desc);
    }

    if (finding.type === 'exploit') {
      const desc = finding.description || '';
      return /wallet.*drain|backdoor|malware|trojan|keylog/i.test(desc) ||
             (finding.severity === 'critical' && /user.*input|network.*input/i.test(desc));
    }

    if (finding.type === 'contract') {
      const desc = finding.description || '';
      return /wallet.*drain|reentrancy.*exploit|access.*control.*bypass/i.test(desc);
    }

    return false;
  }

  private filterMaliciousOnly(
    findings: SecurityFinding[],
    contents: any[]
  ): SecurityFinding[] {
    const filtered: SecurityFinding[] = [];

    for (const finding of findings) {
      if (this.isMaliciousIntent(finding)) {
        filtered.push(finding);
        continue;
      }

      if (isSystemCode && this.isNormalSystemPattern(finding)) {
        continue;
      }

      if (finding.type === 'dependency' && finding.severity !== 'critical') {
        continue;
      }

      if (finding.type === 'obfuscation' && !this.isMaliciousIntent(finding)) {
        continue;
      }

      if (finding.severity === 'low' || finding.severity === 'medium') {
        continue;
      }

      filtered.push(finding);
    }

    return filtered;
  }


  private generateScoreRationale(
    riskLevel: string,
    findings: SecurityFinding[],
    isIntentionallyVulnerable: boolean,
    hasWalletConnection: boolean
  ): string {
    const dangerousVariants = [
      'this code appears intentionally unsafe.',
      'this wasn\'t an accident.',
      'someone meant harm here.',
      'this looks deliberate.',
      'the intent is clear.'
    ];

    const intentVariants = [
      'this project expands its attack surface.',
      'this widens the exposure.',
      'more surface area than needed.',
      'the boundaries are loose.',
      'it opens more doors.'
    ];

    const suspiciousVariants = [
      'some signals, but uncertainty remains.',
      'patterns exist, clarity doesn\'t.',
      'there are signs, not conclusions.',
      'signals present, context missing.',
      'something shows, not everything.'
    ];

    const safeVariants = [
      'no meaningful risk signals detected.',
      'nothing stands out as dangerous.',
      'no clear threats visible.',
      'nothing here raises alarms.',
      'the surface looks clean.'
    ];

    if (riskLevel === 'DANGEROUS') {
      return dangerousVariants[Math.floor(Math.random() * dangerousVariants.length)];
    }

    if (isIntentionallyVulnerable || hasWalletConnection) {
      return intentVariants[Math.floor(Math.random() * intentVariants.length)];
    }

    if (riskLevel === 'SUSPICIOUS') {
      return suspiciousVariants[Math.floor(Math.random() * suspiciousVariants.length)];
    }

    return safeVariants[Math.floor(Math.random() * safeVariants.length)];
  }

  private calculateConfidence(
    readmeFetched: boolean,
    treeFetched: boolean,
    filesFetched: boolean
  ): { confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW'; confidenceScore: number } {
    if (readmeFetched && treeFetched && filesFetched) {
      return { confidenceLevel: 'HIGH', confidenceScore: 85 };
    }

    if (readmeFetched && treeFetched) {
      return { confidenceLevel: 'MEDIUM', confidenceScore: 60 };
    }

    if (readmeFetched || treeFetched) {
      return { confidenceLevel: 'MEDIUM', confidenceScore: 50 };
    }

    return { confidenceLevel: 'LOW', confidenceScore: 30 };
  }

  private generateRiskPosture(
    riskLevel: string,
    findings: SecurityFinding[],
    contents: any[],
    owner?: string,
    repo?: string
  ): string {
    const isSystemCode = this.isSystemOrKernelCode(contents, owner, repo);

    if (riskLevel === 'SAFE') {
      if (isSystemCode) {
        return 'low-risk, high-complexity system code.';
      }
      return 'low-risk repository with no malicious behavior.';
    }

    if (riskLevel === 'SUSPICIOUS') {
      return 'experimental project with mild hygiene risks.';
    }

    if (riskLevel === 'DANGEROUS') {
      return 'high-risk repository with malicious behavior.';
    }

    return 'low-risk repository with no malicious behavior.';
  }

}
