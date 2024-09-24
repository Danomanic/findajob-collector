// Scrape https://findajob.dwp.gov.uk/search?q=&w=

const puppeteer = require('puppeteer');
const fs = require('fs');

const SEARCH_PAGE = 'https://findajob.dwp.gov.uk/search?loc=86386&p=60&pp=50';

const getJobData = async (browser, url) => {
  const page = await browser.newPage();
  await page.goto(url);

  const job = await page.evaluate(() => {
    const details = Array.from(document.querySelectorAll('#ad_details > div.govuk-grid-column-two-thirds > table > tbody > tr')).map((row) => {
      const key = row.querySelector('th').textContent.trim().replace(':', '').toUpperCase().split(' ')
        .join('_');
      const value = row.querySelector('td').textContent.trim();
      return { [key]: value };
    });

    const job = {
      TITLE: document.querySelector('#ad_details > div.govuk-grid-column-two-thirds > h1').textContent.trim(),
      DESCRIPTION: document.querySelector('[itemprop="description"]').textContent.trim(),
    };

    // Combine details into job object
    details.forEach((detail) => {
      const key = Object.keys(detail)[0];
      const value = Object.values(detail)[0];
      job[key] = value;
    });

    return job;
  });

  return job;
};

(async () => {
  const jobs = [];
  const browser = await puppeteer.launch();

  // Scrape list of jobs then navigate to each job page to get more details
  const page = await browser.newPage();
  await page.goto(SEARCH_PAGE);

  const jobLinks = await page.evaluate(() => {
    const job = Array.from(document.querySelectorAll('#search_results >  div > h3 > a'));
    return job.map((link) => link.href);
  });

  for (let i = 0; i < jobLinks.length; i++) {
    const job = await getJobData(browser, jobLinks[i]);
    jobs.push(job);
  }

  // Read jobs.json file then combine with new jobs and write back to file
  const existingJobs = JSON.parse(fs.readFileSync('jobs.json'));
  jobs.push(...existingJobs);

  fs.writeFileSync('jobs.json', JSON.stringify(jobs, null, 2));

  await browser.close();
})();

// Run the script
// node src/index.js
