import type { SearchResult } from '@resumeradar/shared';
import { filterIndividualJobResults } from '@resumeradar/shared';
import { config } from '../../config.js';
import type { SearchProvider } from './types.js';

export class TavilySearchProvider implements SearchProvider {
  async search(query: string): Promise<SearchResult[]> {
    if (!config.searchApiKey) {
      throw new Error('SEARCH_API_KEY is not configured');
    }

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: config.searchApiKey,
        query: `"${query}" job posting apply now site:linkedin.com/jobs/view OR site:remoteok.com/remote-jobs OR site:kalibrr.com/c/job-board`,
        search_depth: 'advanced',
        max_results: 10,
        include_domains: [],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tavily API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      results: Array<{ title: string; url: string; content: string }>;
    };

    return filterIndividualJobResults(
      data.results.map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.content,
        source: new URL(r.url).hostname.replace('www.', ''),
      }))
    );
  }
}

const MOCK_JOBS: SearchResult[] = [
  {
    title: 'Junior Laravel Developer',
    url: 'https://www.linkedin.com/jobs/view/3856789012',
    snippet: 'Junior Laravel Developer role in the Philippines. Required skills: PHP, Laravel, MySQL, JavaScript, Git. Remote and hybrid options. Fresh graduates welcome. Apply on LinkedIn.',
    source: 'linkedin.com',
    company: 'Tech Solutions Inc',
  },
  {
    title: 'PHP Web Developer – Entry Level',
    url: 'https://remoteok.com/remote-jobs/remote-php-web-developer-482931',
    snippet: 'PHP Web Developer positions on RemoteOK. Requirements: PHP, MySQL, JavaScript, HTML, CSS, Git. Entry level and mid-level remote roles. Manila or remote. Competitive USD salaries.',
    source: 'remoteok.com',
    company: 'Digital Agency PH',
  },
  {
    title: 'Junior Full Stack Developer',
    url: 'https://www.linkedin.com/jobs/view/3856789013',
    snippet: 'Junior Full Stack Developer – PHP, Laravel, MySQL, JavaScript, Git. Full-time and remote positions in the Philippines. 1 year experience preferred. Competitive salary.',
    source: 'linkedin.com',
    company: 'StartupXYZ Philippines',
  },
  {
    title: 'Web Developer – PHP & MySQL (Freelance)',
    url: 'https://www.freelancer.com/projects/php/web-developer-php-mysql-3847291',
    snippet: 'PHP / MySQL Web Developer projects on Freelancer. Short and long-term contracts available. Skills: PHP, MySQL, JavaScript, HTML, CSS. Remote worldwide.',
    source: 'freelancer.com',
    company: 'Freelancer Marketplace',
  },
  {
    title: 'Remote Laravel Developer – Philippines',
    url: 'https://remoteok.com/remote-jobs/remote-laravel-developer-philippines-482932',
    snippet: 'Remote Laravel Developer for a Philippines-based team. PHP, Laravel, REST API, MySQL, Git required. 1+ years experience. Timezone: Asia/Manila. Competitive USD rate.',
    source: 'remoteok.com',
    company: 'RemoteFirst Co',
  },
  {
    title: 'Junior Software Developer – PHP',
    url: 'https://www.kalibrr.com/c/job-board/software-engineer/12345/junior-software-developer-php',
    snippet: 'Junior Software Developer. Skills: PHP, JavaScript, HTML, CSS, MySQL. Fresh graduates welcome. Full-time positions across Metro Manila and Cebu.',
    source: 'kalibrr.com',
    company: 'Cebu Tech Hub',
  },
  {
    title: 'PHP Developer – Contract / Freelance',
    url: 'https://www.freelancer.com/projects/laravel/laravel-php-developer-contract-3847292',
    snippet: 'Laravel PHP Developer contracts on Freelancer. Short and long-term projects. Skills: PHP, Laravel, MySQL, Git, REST API. Remote worldwide. Competitive hourly rates.',
    source: 'freelancer.com',
    company: 'Freelancer Network',
  },
  {
    title: 'Full Stack Web Developer – Manila',
    url: 'https://www.linkedin.com/jobs/view/3856789014',
    snippet: 'Full Stack Web Developer with PHP, Laravel, JavaScript, Git. Hybrid work in Metro Manila. Requirements: PHP, Laravel, MySQL, JavaScript. 1-2 years experience.',
    source: 'linkedin.com',
    company: 'Manila Digital Inc',
  },
  {
    title: 'Backend Developer – PHP Laravel',
    url: 'https://www.linkedin.com/jobs/view/3856789015',
    snippet: 'Backend Developer using PHP and Laravel framework. MySQL database, RESTful API design, Git version control. Remote-friendly Philippines positions. Salary: PHP 25,000–40,000/month.',
    source: 'linkedin.com',
    company: 'PH Digital Studio',
  },
  {
    title: 'Web Application Developer – PHP',
    url: 'https://www.linkedin.com/jobs/view/3856789016',
    snippet: 'Web Application Developer using PHP, Laravel, MySQL, JavaScript. 1+ year experience required. Bachelor of Science in IT or related field. Manila office, partial WFH.',
    source: 'linkedin.com',
    company: 'Acme Web PH',
  },
];

export class MockSearchProvider implements SearchProvider {
  async search(query: string): Promise<SearchResult[]> {
    const q = query.toLowerCase();
    return filterIndividualJobResults(
      MOCK_JOBS.filter(
        (job) =>
          job.title.toLowerCase().includes(q.split('"')[1]?.toLowerCase() ?? q) ||
          job.snippet.toLowerCase().includes(q.split(' ')[0])
      ).slice(0, 5)
    );
  }
}

export function createSearchProvider(): SearchProvider {
  if (config.searchApiKey && config.searchProvider === 'tavily') {
    return new TavilySearchProvider();
  }
  console.warn('[Search] SEARCH_API_KEY not set — using mock search provider for development');
  return new MockSearchProvider();
}
