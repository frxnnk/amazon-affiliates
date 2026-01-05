import { Octokit } from '@octokit/rest';

const getOctokit = () => {
  const token = import.meta.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is not set');
  }
  return new Octokit({ auth: token });
};

const getConfig = () => ({
  owner: import.meta.env.GITHUB_OWNER || '',
  repo: import.meta.env.GITHUB_REPO || '',
  branch: import.meta.env.GITHUB_BRANCH || 'main',
});

interface FileContent {
  path: string;
  content: string;
  message: string;
}

export async function createOrUpdateFile({ path, content, message }: FileContent) {
  const octokit = getOctokit();
  const { owner, repo, branch } = getConfig();

  // Check if file exists to get SHA
  let sha: string | undefined;
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });
    if (!Array.isArray(data) && data.type === 'file') {
      sha = data.sha;
    }
  } catch {
    // File doesn't exist, will create new
  }

  // Create or update file
  const response = await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: Buffer.from(content).toString('base64'),
    branch,
    sha,
  });

  return response.data;
}

export async function deleteFile(path: string, message: string) {
  const octokit = getOctokit();
  const { owner, repo, branch } = getConfig();

  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path,
    ref: branch,
  });

  if (Array.isArray(data) || data.type !== 'file') {
    throw new Error('Path is not a file');
  }

  await octokit.repos.deleteFile({
    owner,
    repo,
    path,
    message,
    sha: data.sha,
    branch,
  });
}

export async function getFileContent(path: string): Promise<string | null> {
  const octokit = getOctokit();
  const { owner, repo, branch } = getConfig();

  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });

    if (Array.isArray(data) || data.type !== 'file') {
      return null;
    }

    return Buffer.from(data.content, 'base64').toString('utf-8');
  } catch {
    return null;
  }
}

export async function listFiles(path: string): Promise<string[]> {
  const octokit = getOctokit();
  const { owner, repo, branch } = getConfig();

  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });

    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .filter((item) => item.type === 'file')
      .map((item) => item.path);
  } catch {
    return [];
  }
}
